# demo/photos (your photos go here; never committed)

Drop four portrait photos of one person here, roughly 3:4, head and shoulders visible:

    a.jpg  b.jpg  c.jpg  d.jpg

Easiest: `.venv/bin/python tools/orient.py <your-folder> demo/photos --names a,b,c,d` (HEIC ok, fixes rotation).
Then `swift tools/mask.swift demo/photos` writes the cutouts to demo/cut/.

Everything in this folder except this README is gitignored. Stock licences (e.g. Adobe Stock) allow using the images
in your video but not redistributing the files, and personal photos should never leave your machine.
Without photos the demo renders placeholder panels.
