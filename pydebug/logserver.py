from flask import Flask, request, jsonify
from flask_cors import CORS  # Импортируем CORS
from datetime import datetime

app = Flask(__name__)
# Разрешаем CORS для всех доменов
CORS(app, origins="*")  # Разрешаем запросы от любого origin

# Альтернативные варианты настройки CORS:
# CORS(app)  # Разрешить все origins (по умолчанию)
# CORS(app, resources={r"/*": {"origins": "*"}})  # Для всех endpoints

# Хранилище логов в памяти
message_logs = []

@app.route('/log', methods=['POST'])
def log_message():
    # Получаем JSON из запроса
    data = request.get_json()
    
    # Проверяем, есть ли поле message в JSON
    if data and 'message' in data:
        message = data['message']
        timestamp = datetime.now().isoformat()
        
        # Создаем запись лога
        log_entry = {
            "timestamp": timestamp,
            "message": message,
            "ip": request.remote_addr
        }
        
        # Добавляем в хранилище
        message_logs.append(log_entry)
        
        # Печатаем в консоль
        print(f"[{timestamp}] Получено сообщение от {request.remote_addr}: {message}")
        
        # Возвращаем ответ с CORS headers
        return jsonify({
            "status": "success", 
            "message": "Сообщение сохранено в лог",
            "log_id": len(message_logs) - 1,
            "timestamp": timestamp
        }), 200
    else:
        return jsonify({
            "status": "error",
            "message": "Неверный формат данных. Ожидается JSON с полем 'message'"
        }), 400

@app.route('/logs', methods=['GET'])
def get_logs():
    # Параметры пагинации
    limit = request.args.get('limit', default=10, type=int)
    offset = request.args.get('offset', default=0, type=int)
    
    # Проверяем валидность параметров
    if limit < 1 or limit > 100000:
        return jsonify({
            "status": "error",
            "message": "Параметр limit должен быть между 1 и 100000"
        }), 400
    
    if offset < 0:
        return jsonify({
            "status": "error",
            "message": "Параметр offset не может быть отрицательным"
        }), 400

    # Получаем часть логов
    total_logs = len(message_logs)
    start_index = max(0, total_logs - offset - limit)
    end_index = total_logs - offset
    logs_slice = message_logs[start_index:end_index]
    
    # Разворачиваем порядок (новые сверху)
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
    
    print(f"Логи очищены. Удалено записей: {count}")
    
    return jsonify({
        "status": "success",
        "message": f"Логи очищены. Удалено {count} записей"
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
            "POST /log": "Добавить сообщение в лог",
            "GET /logs": "Получить список логов",
            "GET /logs/count": "Получить количество логов",
            "DELETE /logs/clear": "Очистить все логи",
            "GET /health": "Проверка здоровья сервиса"
        },
        "cors": "enabled_for_all_origins"
    })


if __name__ == '__main__':
    print("Запуск сервера Flask Message Logger с CORS...")
    print("CORS настроен для всех доменов (*)")
    print("Доступные endpoints:")
    print("  POST /log - добавить сообщение")
    print("  GET  /logs - получить логи")
    print("  GET  /logs/count - количество логов")
    print("  DELETE /logs/clear - очистить логи")
    print("  GET  /health - проверка здоровья")
    app.run(debug=True, host='0.0.0.0', port=5001)