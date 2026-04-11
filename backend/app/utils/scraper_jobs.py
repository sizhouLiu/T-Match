#!/usr/bin/env python3
"""
爬取求职方舟职位数据脚本
使用 agent-browser 获取 AG Grid 表格数据
"""

import subprocess
import json
import requests
import time
import re

BASE_URL = "https://www.qiuzhifangzhou.com/job"
API_URL = "http://localhost:8000/api/jobs/batch"

# JavaScript 用于提取 AG Grid 数据
JS_SCRIPT = '''
const leftViewport = document.querySelector('.ag-pinned-left-cols-viewport') || document.querySelector('.ag-pinned-left-cols-container');
const centerViewport = document.querySelector('.ag-center-cols-viewport') || document.querySelector('.ag-center-cols-container');

const jobs = [];

if (leftViewport && centerViewport) {
  const leftRows = leftViewport.querySelectorAll('.ag-row');
  
  leftRows.forEach((leftRow) => {
    const rowIndex = leftRow.getAttribute('row-index');
    const leftCells = leftRow.querySelectorAll('.ag-cell');
    
    const centerRow = centerViewport.querySelector(`.ag-row[row-index="${rowIndex}"]`);
    
    if (centerRow) {
      const centerCells = centerRow.querySelectorAll('.ag-cell');
      
      const job = {};
      
      // 左侧固定列数据
      leftCells.forEach((cell) => {
        const colId = cell.getAttribute('col-id');
        const text = cell.textContent.trim();
        if (colId === 'updateTime') job.update_date = text;
        if (colId === 'tags') job.company_type = text;
        if (colId === 'company') job.company = text;
      });
      
      // 中间滚动列数据
      centerCells.forEach((cell) => {
        const colId = cell.getAttribute('col-id');
        const text = cell.textContent.trim();
        
        // 清理职位名称中的来源标记
        if (colId === 'position') {
          // 获取详情链接
          const link = cell.querySelector('a');
          if (link) {
            job.detail_url = link.href;
          }
          // 清理职位名称
          job.title = text.replace(/官|智|B|资|国|前|社|央|企|上|市|大|中|小|微|型/g, '').replace(/\\n/g, '').trim();
        }
        if (colId === 'industry') job.industry = text;
        if (colId === 'reliability') job.credit_score = text;
        if (colId === 'matchScore') job.match_score = text;
        if (colId === 'city') job.location = text;
        if (colId === 'education') job.education = text;
        if (colId === 'grade') job.grade = text;
        if (colId === 'major') job.major = text;
      });
      
      // 只添加有公司和职位的记录
      if (job.company && job.title) {
        job.source_url = 'https://www.qiuzhifangzhou.com/job';
        job.job_type = 'full-time';
        if (job.title.includes('实习')) job.job_type = 'internship';
        jobs.push(job);
      }
    }
  });
}

JSON.stringify(jobs);
'''

def run_browser_command(cmd, timeout=60):
    """运行 agent-browser 命令"""
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        shell=True
    )
    return result

def scrape_jobs():
    """爬取职位数据"""
    print("正在打开浏览器...")
    run_browser_command(f"agent-browser open '{BASE_URL}'")
    
    print("等待页面加载...")
    time.sleep(2)
    run_browser_command("agent-browser wait --load networkidle")
    time.sleep(2)
    
    print("正在提取职位数据...")
    # 将JS脚本写入临时文件
    result = subprocess.run(
        ['agent-browser', 'eval', '--stdin'],
        input=JS_SCRIPT,
        capture_output=True,
        text=True,
        timeout=60
    )
    
    jobs_json = result.stdout.strip()
    
    # 关闭浏览器
    print("关闭浏览器...")
    run_browser_command("agent-browser close")
    
    # 解析JSON
    if jobs_json:
        try:
            # 移除可能的引号
            if jobs_json.startswith('"'):
                jobs_json = jobs_json[1:-1] if jobs_json.endswith('"') else jobs_json[1:]
            jobs_json = jobs_json.replace('\\"', '"')
            jobs = json.loads(jobs_json)
            return jobs
        except json.JSONDecodeError as e:
            print(f"JSON解析错误: {e}")
            print(f"原始数据: {jobs_json[:500]}")
            return []
    
    return []

def save_to_api(jobs):
    """通过API保存职位数据"""
    if not jobs:
        print("没有职位数据需要保存")
        return
    
    print(f"正在保存 {len(jobs)} 条职位数据...")
    
    try:
        response = requests.post(API_URL, json=jobs, timeout=30)
        if response.status_code == 200:
            result = response.json()
            print(f"成功保存 {len(result)} 条职位数据")
        else:
            print(f"保存失败: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"保存错误: {e}")

def main():
    print("=" * 50)
    print("求职方舟职位爬虫")
    print("=" * 50)
    
    # 爬取数据
    jobs = scrape_jobs()
    
    print(f"\n爬取到 {len(jobs)} 条职位数据")
    
    if jobs:
        # 显示前3条数据示例
        print("\n数据示例:")
        for job in jobs[:3]:
            print(f"  - {job.get('title')} @ {job.get('company')} ({job.get('location')})")
        
        # 保存到API
        save_to_api(jobs)
    
    print("\n完成!")

if __name__ == "__main__":
    main()
