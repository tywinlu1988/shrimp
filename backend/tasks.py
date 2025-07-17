import logging
import time
import json
import random
from typing import Dict, List, Any, Optional

import httpx

from . import celery_app

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('tasks.log'), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# 模拟电商平台评论数据
MOCK_COMMENTS = [
    {"content": "质量很好，物超所值！", "rating": 5, "date": "2025-06-10"},
    {"content": "快递很快，包装完好", "rating": 5, "date": "2025-06-12"},
    {"content": "用了一周，感觉还不错", "rating": 4, "date": "2025-06-15"},
    {"content": "性价比高，但做工一般", "rating": 3, "date": "2025-06-18"},
    {"content": "外观漂亮，但噪音有点大", "rating": 3, "date": "2025-06-20"},
    {"content": "客服态度很差，退货困难", "rating": 2, "date": "2025-06-22"},
    {"content": "收到就是坏的，完全是智商税", "rating": 1, "date": "2025-06-25"},
    {"content": "广告宣传过度，实际效果差", "rating": 2, "date": "2025-06-28"},
]

# 模拟AI分析结果的标签
POSITIVE_TAGS = ["性价比高", "质量好", "外观漂亮", "物流快", "客服好", "效果好"]
NEGATIVE_TAGS = ["做工粗糙", "噪音大", "客服差", "性能一般", "价格虚高", "智商税"]

# 内存存储任务状态和结果
task_store = {}

@celery_app.task(bind=True)
def analyze_product(self, product_url: str) -> Dict[str, Any]:
    """
    分析商品评论并生成拔草报告
    
    Args:
        product_url: 商品链接URL
        
    Returns:
        Dict: 包含分析结果的字典
    """
    task_id = self.request.id
    logger.info(f"开始分析商品: {product_url}, 任务ID: {task_id}")
    
    try:
        # 更新任务状态为正在解析链接
        update_task_status(task_id, "parsing_url", "正在解析商品链接...")
        time.sleep(2)  # 模拟解析过程
        
        # 提取商品信息
        product_info = extract_product_info(product_url)
        
        # 更新任务状态为正在抓取评论
        update_task_status(task_id, "fetching_comments", "正在抓取商品评论...")
        time.sleep(3)  # 模拟抓取过程
        
        # 获取评论数据
        comments = fetch_product_comments(product_url)
        
        # 更新任务状态为AI分析中
        update_task_status(task_id, "ai_analyzing", "AI正在分析评论数据...")
        time.sleep(4)  # 模拟AI分析过程
        
        # 生成分析报告
        report = generate_analysis_report(product_info, comments)
        
        # 更新任务状态为完成
        update_task_status(task_id, "completed", "分析完成", report)
        
        logger.info(f"商品分析完成: {product_url}, 任务ID: {task_id}")
        return report
        
    except Exception as e:
        logger.error(f"分析商品时出错: {str(e)}", exc_info=True)
        update_task_status(task_id, "failed", f"分析失败: {str(e)}")
        return {"error": str(e)}

def update_task_status(task_id: str, status: str, message: str, data: Optional[Dict] = None) -> None:
    """
    更新任务状态
    
    Args:
        task_id: 任务ID
        status: 状态代码
        message: 状态描述
        data: 任务数据(可选)
    """
    task_store[task_id] = {
        "status": status,
        "message": message,
        "timestamp": time.time(),
        "data": data
    }
    logger.debug(f"任务状态更新: {task_id} -> {status}: {message}")

def extract_product_info(product_url: str) -> Dict[str, str]:
    """
    从URL中提取商品信息
    
    Args:
        product_url: 商品链接
        
    Returns:
        Dict: 商品基本信息
    """
    # 这里应该实现实际的URL解析逻辑
    # 目前使用模拟数据
    platform = "淘宝" if "taobao" in product_url else "京东" if "jd" in product_url else "未知平台"
    
    return {
        "title": f"{platform}热销商品",
        "price": f"¥{random.randint(99, 999)}",
        "platform": platform,
        "url": product_url,
        "image_url": "https://picsum.photos/300/300"
    }

def fetch_product_comments(product_url: str) -> List[Dict[str, Any]]:
    """
    抓取商品评论
    
    Args:
        product_url: 商品链接
        
    Returns:
        List: 评论列表
    """
    # 这里应该实现实际的评论抓取逻辑
    # 目前使用模拟数据
    return random.sample(MOCK_COMMENTS, k=min(len(MOCK_COMMENTS), 5))

def generate_analysis_report(product_info: Dict[str, str], comments: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    生成分析报告
    
    Args:
        product_info: 商品信息
        comments: 评论数据
        
    Returns:
        Dict: 结构化的分析报告
    """
    # 计算拔草指数
    ratings = [comment["rating"] for comment in comments]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0
    negative_count = sum(1 for r in ratings if r <= 3)
    weed_out_score = int((negative_count / len(ratings) * 100) if ratings else 50)
    
    # 生成标签云
    positive_tags = random.sample(POSITIVE_TAGS, k=min(len(POSITIVE_TAGS), 3))
    negative_tags = random.sample(NEGATIVE_TAGS, k=min(len(NEGATIVE_TAGS), 3))
    
    # 生成一句话总结
    summary = generate_one_liner(product_info["title"], weed_out_score)
    
    # 提取优缺点
    pros = extract_pros(comments)
    cons = extract_cons(comments)
    
    return {
        "product_info": product_info,
        "weed_out_score": weed_out_score,
        "summary": summary,
        "positive_tags": positive_tags,
        "negative_tags": negative_tags,
        "pros": pros,
        "cons": cons,
        "comments": comments,
        "timestamp": time.time()
    }

def generate_one_liner(product_title: str, weed_out_score: int) -> str:
    """
    生成一句话总结
    
    Args:
        product_title: 商品标题
        weed_out_score: 拔草指数
        
    Returns:
        str: 一句话总结
    """
    if weed_out_score >= 70:
        return f"这款{product_title}问题较多，建议谨慎购买"
    elif weed_out_score >= 40:
        return f"这款{product_title}优缺点并存，请根据个人需求决定"
    else:
        return f"这款{product_title}整体表现不错，值得考虑"

def extract_pros(comments: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    提取正面评价
    
    Args:
        comments: 评论列表
        
    Returns:
        List: 优点列表
    """
    positive_comments = [c for c in comments if c["rating"] >= 4]
    pros = []
    
    if positive_comments:
        for i, comment in enumerate(positive_comments[:2]):
            pros.append({
                "title": f"优点{i+1}",
                "content": comment["content"],
                "source": f"来自用户评价 ({comment['date']})"
            })
    
    return pros

def extract_cons(comments: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    提取负面评价
    
    Args:
        comments: 评论列表
        
    Returns:
        List: 缺点列表
    """
    negative_comments = [c for c in comments if c["rating"] <= 3]
    cons = []
    
    if negative_comments:
        for i, comment in enumerate(negative_comments[:2]):
            cons.append({
                "title": f"槽点{i+1}",
                "content": comment["content"],
                "source": f"来自用户评价 ({comment['date']})"
            })
    
    return cons

@celery_app.task
def cleanup_old_tasks() -> None:
    """定期清理过期的任务数据"""
    current_time = time.time()
    expired_time = current_time - (24 * 60 * 60)  # 24小时过期
    
    expired_tasks = [task_id for task_id, task_data in task_store.items() 
                    if task_data.get("timestamp", 0) < expired_time]
    
    for task_id in expired_tasks:
        if task_id in task_store:
            del task_store[task_id]
            
    logger.info(f"清理了 {len(expired_tasks)} 个过期任务")

def get_task_status(task_id: str) -> Dict[str, Any]:
    """
    获取任务状态
    
    Args:
        task_id: 任务ID
        
    Returns:
        Dict: 任务状态信息
    """
    if task_id in task_store:
        return task_store[task_id]
    return {"status": "not_found", "message": "任务不存在"}
