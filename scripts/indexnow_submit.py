#!/usr/bin/env python3
import json,re,urllib.request,urllib.error
HOST='tools.thepan.xyz'
KEY='65c4754752b477da0dafffbca6277852'
SITEMAP=f"https://{HOST}/sitemap.xml"
sitemap_req=urllib.request.Request(SITEMAP,headers={"User-Agent":"Mozilla/5.0 7thleaf-indexnow/1.0"})
xml=urllib.request.urlopen(sitemap_req,timeout=20).read().decode("utf-8","replace")
urls=re.findall(r"<loc>(.*?)</loc>",xml)
if not urls:
    raise SystemExit("no sitemap URLs found")
payload=json.dumps({"host":HOST,"key":KEY,"keyLocation":f"https://{HOST}/{KEY}.txt","urlList":urls}).encode()
req=urllib.request.Request("https://api.indexnow.org/indexnow",data=payload,headers={"Content-Type":"application/json; charset=utf-8"},method="POST")
try:
    with urllib.request.urlopen(req,timeout=20) as r:
        print(f"IndexNow {HOST}: HTTP {r.status}, urls={len(urls)}")
except urllib.error.HTTPError as e:
    print(f"IndexNow {HOST}: HTTP {e.code}, urls={len(urls)}")
    if e.code not in (200,202):
        raise
