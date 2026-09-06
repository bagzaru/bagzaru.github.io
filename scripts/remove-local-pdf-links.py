"""Create a submission copy without links to the local preview server."""

import argparse
import ipaddress
import json
from pathlib import Path
from urllib.parse import urlsplit

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, NameObject


def is_local_url(uri):
    host = urlsplit(uri).hostname
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("destination", type=Path)
args = parser.parse_args()
if args.source.resolve() == args.destination.resolve():
    parser.error("The destination must differ from the source.")

reader = PdfReader(args.source, strict=True)
writer = PdfWriter()
removed = 0
for page in reader.pages:
    kept = ArrayObject()
    for reference in page.get("/Annots", []):
        annotation = reference.get_object()
        action = annotation.get("/A", {})
        if action.get("/S") == "/URI" and is_local_url(str(action.get("/URI", ""))):
            removed += 1
        else:
            kept.append(reference)
    if "/Annots" in page:
        page[NameObject("/Annots")] = kept
    writer.add_page(page)
if reader.metadata:
    writer.add_metadata({key: str(value) for key, value in reader.metadata.items()})
args.destination.parent.mkdir(parents=True, exist_ok=True)
with args.destination.open("wb") as output:
    writer.write(output)
print(json.dumps({"pages": len(reader.pages), "removed_links": removed,
                  "bytes": args.destination.stat().st_size}))
