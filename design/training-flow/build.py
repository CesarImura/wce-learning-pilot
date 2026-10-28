# Inlines flow-data.js into index.html -> dist/training-flow.html, and copies the screens next to it.
import os, shutil
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "dist")
os.makedirs(os.path.join(out, "shots"), exist_ok=True)
page = open(os.path.join(here, "index.html")).read().replace("/*FLOW_DATA*/", open(os.path.join(here, "flow-data.js")).read())
open(os.path.join(out, "training-flow.html"), "w").write(page)
for f in os.listdir(os.path.join(here, "shots")):
    shutil.copy(os.path.join(here, "shots", f), os.path.join(out, "shots", f))
print("built", os.path.join(out, "training-flow.html"))
