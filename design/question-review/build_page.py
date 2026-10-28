# Builds index.html from template.html + the question data and screenshot map.
# python3 build_page.py <rows.json> <shots.json>
import json, sys
rows = json.load(open(sys.argv[1]))
shots = json.load(open(sys.argv[2]))
t = open("template.html").read()
safe = lambda o: json.dumps(o, ensure_ascii=False).replace("</", "<\\/")
open("index.html", "w").write(t.replace("__ROWS__", safe(rows)).replace("__SHOTS__", safe(shots)))
print("index.html:", len(rows), "questions,", sum(1 for v in shots.values() if v.get("q")), "with screenshots")
