from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
from datetime import datetime

app = Flask(__name__)
# Allow CORS for all domains
CORS(app, origins="*")  # Allow requests from any origin

# Alternative ways to configure CORS:
# CORS(app)  # Allow all origins (the default)
# CORS(app, resources={r"/*": {"origins": "*"}})  # For all endpoints

# In-memory log storage
message_logs = []

@app.route('/log', methods=['POST'])
def log_message():
    # Get the JSON from the request
    data = request.get_json()

    # Check whether the JSON has a message field
    if data and 'message' in data:
        message = data['message']
        timestamp = datetime.now().isoformat()

        # Create a log entry
        log_entry = {
            "timestamp": timestamp,
            "message": message,
            "ip": request.remote_addr
        }

        # Add it to the storage
        message_logs.append(log_entry)

        # Print to the console
        print(f"[{timestamp}] Received a message from {request.remote_addr}: {message}")

        # Return a response with CORS headers
        return jsonify({
            "status": "success",
            "message": "Message saved to the log",
            "log_id": len(message_logs) - 1,
            "timestamp": timestamp
        }), 200
    else:
        return jsonify({
            "status": "error",
            "message": "Invalid data format. Expected JSON with a 'message' field"
        }), 400

@app.route('/logs', methods=['GET'])
def get_logs():
    # Pagination parameters
    limit = request.args.get('limit', default=10, type=int)
    offset = request.args.get('offset', default=0, type=int)

    # Validate the parameters
    if limit < 1 or limit > 100000:
        return jsonify({
            "status": "error",
            "message": "The limit parameter must be between 1 and 100000"
        }), 400

    if offset < 0:
        return jsonify({
            "status": "error",
            "message": "The offset parameter cannot be negative"
        }), 400

    # Get a slice of the logs
    total_logs = len(message_logs)
    start_index = max(0, total_logs - offset - limit)
    end_index = total_logs - offset
    logs_slice = message_logs[start_index:end_index]

    # Reverse the order (newest first)
    logs_slice.reverse()

    return jsonify({
        "status": "success",
        "total_logs": total_logs,
        "showing": len(logs_slice),
        "limit": limit,
        "offset": offset,
        "logs": logs_slice
    })

@app.route('/logs/count', methods=['GET'])
def get_logs_count():
    return jsonify({
        "status": "success",
        "total_logs": len(message_logs),
        "last_log_time": message_logs[-1]["timestamp"] if message_logs else None
    })

@app.route('/logs/clear', methods=['DELETE'])
def clear_logs():

    global message_logs
    count = len(message_logs)
    message_logs = []

    print(f"Logs cleared. Entries deleted: {count}")

    return jsonify({
        "status": "success",
        "message": f"Logs cleared. Deleted {count} entries"
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "message_logger",
        "log_count": len(message_logs),
        "uptime": "running"
    })

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "Message Logger API",
        "endpoints": {
            "POST /log": "Add a message to the log",
            "GET /logs": "Get the list of logs",
            "GET /logs/count": "Get the number of logs",
            "DELETE /logs/clear": "Clear all logs",
            "GET /health": "Service health check"
        },
        "cors": "enabled_for_all_origins"
    })


if __name__ == '__main__':
    print("Starting the Flask Message Logger server with CORS...")
    print("CORS is configured for all domains (*)")
    print("Available endpoints:")
    print("  POST /log - add a message")
    print("  GET  /logs - get the logs")
    print("  GET  /logs/count - number of logs")
    print("  DELETE /logs/clear - clear the logs")
    print("  GET  /health - health check")
    app.run(debug=True, host='0.0.0.0', port=5001)
