"""Verify the exact content paths that Android's asset loader serves."""
import json
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as apk:
    names = set(apk.namelist())
    assert "AndroidManifest.xml" in names and "classes.dex" in names
    assert "assets/index.html" in names
    mushaf = json.loads(apk.read("assets/data/mushaf.json"))
    assert mushaf["pageCount"] == 604 and mushaf["verseCount"] == 6236
    assert len(mushaf["pages"]) == 604
    assert len(json.loads(apk.read("assets/data/surahs.json"))) == 114
    index = json.loads(apk.read("assets/data/hadith/index.json"))
    chunks = [name for name in names if name.startswith("assets/data/hadith/chunk-")]
    assert len(chunks) == 65
    for name in chunks:
        json.loads(apk.read(name))
    print("APK verified: 604 Quran pages, 114 surahs and 65 hadith chunks.")
