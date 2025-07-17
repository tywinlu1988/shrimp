from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import logging
import sys
import os
import time
import json
from typing import Dict, Any, Optional
import httpx
from tasks import analyze_product, get_task_status

# 定义全局logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s', 
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('app.log')
    ]
)

# 设置全局异常捕获
def global_exception_handler(exctype, value, traceback):
    logging.critical("未捕获的全局异常", exc_info=(exctype, value, traceback))
sys.excepthook = global_exception_handler

# 严格按照如下方式配置静态资源
app = Flask(__name__, static_folder='../frontend/public', static_url_path='/')
CORS(app)

# 内存存储任务状态
task_cache = {}

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    接收商品链接并启动分析任务
    
    请求参数:
        url (str): 商品链接
        
    返回:
        JSON: 包含task_id的响应
    """
    try:
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({"error": "缺少商品链接参数"}), 400
            
        product_url = data['url']
        
        if not isinstance(product_url, str) or not product_url.strip():
            return jsonify({"error": "商品链接不能为空"}), 400
            
        # 启动Celery任务
        task = analyze_product.delay(product_url)
        task_id = task.id
        
        logging.info(f"创建新分析任务: {task_id} 商品链接: {product_url}")
        
        return jsonify({
            "task_id": task_id,
            "status": "created",
            "message": "分析任务已创建"
        })
        
    except Exception as e:
        logging.error(f"创建分析任务失败: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/status/<task_id>', methods=['GET'])
def get_status(task_id: str):
    """
    查询分析任务进度
    
    路径参数:
        task_id (str): 任务ID
        
    返回:
        JSON: 任务状态信息
    """
    try:
        if not task_id or not isinstance(task_id, str):
            return jsonify({"error": "无效的任务ID"}), 400
            
        # 先检查本地缓存
        if task_id in task_cache:
            return jsonify(task_cache[task_id])
            
        # 从Celery获取任务状态
        task_info = get_task_status(task_id)
        
        # 更新本地缓存
        task_cache[task_id] = task_info
        
        return jsonify(task_info)
        
    except Exception as e:
        logging.error(f"获取任务状态失败: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/report/<task_id>', methods=['GET'])
def get_report(task_id: str):
    """
    获取生成的拔草报告
    
    路径参数:
        task_id (str): 任务ID
        
    返回:
        JSON: 拔草报告数据
    """
    try:
        if not task_id or not isinstance(task_id, str):
            return jsonify({"error": "无效的任务ID"}), 400
            
        # 获取任务状态
        task_info = get_task_status(task_id)
        
        # 检查任务是否完成
        if task_info.get("status") != "completed":
            return jsonify({
                "error": "报告尚未生成完成", 
                "status": task_info.get("status", "unknown"),
                "message": task_info.get("message", "未知状态")
            }), 404
            
        # 返回报告数据
        report_data = task_info.get("data", {})
        if not report_data:
            return jsonify({"error": "报告数据为空"}), 404
            
        return jsonify(report_data)
        
    except Exception as e:
        logging.error(f"获取报告数据失败: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/logs', methods=['POST'])
def collect_logs():
    """
    前端异常日志收集
    
    请求参数:
        error (object): 错误信息对象
        
    返回:
        JSON: 确认响应
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "缺少日志数据"}), 400
            
        # 记录前端错误日志
        logging.error(f"前端错误: {json.dumps(data, ensure_ascii=False)}")
        
        return jsonify({"status": "success", "message": "日志已记录"})
        
    except Exception as e:
        logging.error(f"记录前端日志失败: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误"}), 500

# 定期清理过期的任务缓存
def cleanup_task_cache():
    """清理超过24小时的任务缓存"""
    current_time = time.time()
    expired_time = current_time - (24 * 60 * 60)  # 24小时过期
    
    expired_tasks = [task_id for task_id, task_data in task_cache.items() 
                    if task_data.get("timestamp", 0) < expired_time]
    
    for task_id in expired_tasks:
        if task_id in task_cache:
            del task_cache[task_id]
            
    logging.info(f"清理了 {len(expired_tasks)} 个过期任务缓存")

# 处理前端路由
@app.route('/')
@app.route('/<path:path>')
def serve_static(path="index.html"):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return app.send_static_file('index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 9044))
    app.run(host='0.0.0.0', port=port, debug=True)