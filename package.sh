#!/bin/bash

#npm run build

if [ -d "package" ]; then
    rm -rf package
fi

mkdir -p package/build
mkdir -p package/node_modules/octicons/build
mkdir -p package/node_modules/pikaday/css

cp build/icon.ico package/build/
cp -r data package/data
cp -r img package/img
cp -r node_modules/octicons/build/svg package/node_modules/octicons/build/svg
cp node_modules/pikaday/css/pikaday.css package/node_modules/pikaday/css/
cp -r style package/style
cp bundle.js package/
cp index.html package/

cd package
zip -q -9 -r sabaki.zip .

cat sabaki.zip | base64 > ../sabaki.zip.base64

cd ..

python3 -c '
import fileinput

with open("sabaki.zip.base64", "r") as f:
    sabaki_zip_base64 = f.read()

replace = False
for line in fileinput.input("autosabaki.py", inplace=True):
    if replace:
        print("sabaki_zip_base64 = b\"%s\"" % sabaki_zip_base64.strip())
        replace = False
        continue

    if line == "# __sabaki_inject__\n":
        replace = True
    print(line, end="")
'

rm sabaki.zip.base64
rm -rf package
