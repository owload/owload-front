const sw = self as unknown as ServiceWorkerGlobalScope & typeof globalThis;

sw.addEventListener('install', async (event) => {
  console.log('service worker installing!', event);
  sw.skipWaiting();
});

function startClientFetch(client: Client, requestId: string, byteOffset: number, byteLength: number) {
  client.postMessage({
    type: "startClientFetch",
    requestId,
    data: { byteOffset, byteLength }
  });
}

async function pullClientFetchData(client: Client, requestId: string): Promise<Uint8Array> {
  return new Promise((resolve) => {
    function handleResponse(event: ExtendableMessageEvent) {
      if (event.data.type === "responseData" && event.data.requestId === requestId) {
        resolve(event.data.data);
        sw.removeEventListener('message', handleResponse);
      }
    }
    sw.addEventListener('message', handleResponse);
    client.postMessage({
      type: "pullClientFetchData",
      requestId,
    });
  });
}

function cancelClientFetch(client: Client, requestId: string) {
  client.postMessage({
    type: "cancelClientFetch",
    requestId,
  });
}

async function getClientFetchReadableSteam(clientId: string, byteOffset: number, byteLength: number): Promise<ReadableStream<Uint8Array>> {
  const requestId = Math.random().toString(36).substring(2);

  return new Promise((resolve, reject) => {
    sw.clients.get(clientId).then(client => {
      if (!client) {
        reject('Client not found');
        return;
      }

      let closeController: () => void;

      function handleResponse(event: ExtendableMessageEvent) {
        if (event.data.type === "responseFinish" && event.data.requestId === requestId) {
          closeController();
          sw.removeEventListener('message', handleResponse);
        }
      }

      const rs = new ReadableStream<Uint8Array>({
        start(controller) {
          closeController = () => {
            try {
              controller.close();
            } catch (e) {}
          };
        },
        async pull(controller) {
          const data = await pullClientFetchData(client, requestId);
          if (data) {
            controller.enqueue(data);
          }
        },
        cancel() {
          cancelClientFetch(client, requestId);
        }
      });

      sw.addEventListener('message', handleResponse);
      startClientFetch(client, requestId, byteOffset, byteLength);
      resolve(rs);
    });
  });
}

async function downloadFileDataOnClient(clientId: string, byteOffset: number, byteLength: number): Promise<ReadableStream<Uint8Array>> {
  return getClientFetchReadableSteam(clientId, byteOffset, byteLength);
}

sw.addEventListener('fetch', async event => {
  if (!event.clientId) return;

  const url = new URL(event.request.url).toString();
  const method = event.request.method;
  if (method === "GET" && url.includes('/videorequest/')) {
    return event.respondWith(fetchWithDataDecrtypt(event))
  }
});

function fetchWithDataDecrtypt(event: FetchEvent) {
  const start = +getUrlPathParam(event.request.url, 1);
  const len = +getUrlPathParam(event.request.url, 0);
  const requestHeaders = getHeaders(event.request.headers);
  const range = requestHeaders.range;
  if (range) {
    return respondPartial(event.clientId, start, len, range);
  } else {
    return respondFully(event.clientId, start, len);
  }
}

function respondPartial(clientId: string, start: number, len: number, range: string) {
  let rangeStart = 0, rangeEnd
  if (range.startsWith('bytes=')) {
    const separatorIndex = range.indexOf('-')
    rangeStart = +range.substring(6, separatorIndex)
    rangeEnd = +range.substring(separatorIndex + 1)
  }
  if (!rangeEnd) {
    rangeEnd = len - 1
  }

  const fileRequestStart = start + rangeStart

  return new Promise<Response>((resolve) => {
    const headers = {
      'Content-Type': 'video/mp4',
      'content-length': "" + (rangeEnd - rangeStart + 1),
      'content-range': 'bytes ' + rangeStart + '-' + rangeEnd + '/' + len
    }
    downloadFileDataOnClient(clientId, fileRequestStart, rangeEnd - rangeStart + 1).then(rs => {
      const response = new Response(rs, {
        headers,
        status: 206,
        statusText: 'Partial Content'
      });
      resolve(response);
    });
  });
}

function getHeaders(headers: Headers): { [key: string]: any } {
  let headerObj: { [key: string]: any } = {};
  const keys = headers.keys();
  let header = keys.next();
  while (header.value) {
    headerObj[header.value] = headers.get(header.value);
    header = keys.next();
  }
  return headerObj;
};

function getUrlPathParam(url: string, iFromEnd: number) {
  if (url.endsWith('/')) {
    url = url.substring(0, url.length - 1)
  }
  const urlParts = url.split('/')
  return urlParts.reverse()[iFromEnd]
}

function respondFully(clientId: string, start: number, len: number) {
  return new Promise<Response>((resolve) => {
    const headers = {
      'Content-Type': 'video/mp4',
      'content-length': "" + len,
    }
    downloadFileDataOnClient(clientId, start, len).then(rs => {
      const response = new Response(rs, {
        headers,
        status: 200,
        statusText: 'OK'
      });
      resolve(response);
    });
  });
}