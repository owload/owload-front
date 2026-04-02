import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncate(str: string, maxLen: number): string {
  if(str.length <= maxLen) {
    return str;
  }
  return str.substring(0, maxLen-11) + "..." + str.substring(str.length-8, str.length)
}

export function saveFileToDisk(data: Uint8Array, name: string) {
      const f = new File([data], name);
      const url = URL.createObjectURL(f)
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
}

export function joinPath(path1: string, path2: string): string {
  const pathComponents = path1.split('/');
  pathComponents.push(...path2.split('/'));
  return '/' + pathComponents.filter(Boolean).join('/');
}

export function getExtension(name: string) {
    const split = name.split('.');
    if (split.length === 1) {
        return '';
    }
    return split[split.length - 1].toLocaleLowerCase();
}