echo "Building started..."

nexe index.js --build --verbose

echo "Copying files to final location..."

sudo rm -rf build/
sudo mkdir build/
sudo mkdir build/crypassy/
sudo mkdir build/crypassy/data/

sudo cp crypassy build/crypassy/crypassy
sudo cp data/mimes.dat build/crypassy/data/mimes.dat
sudo cp -r json/ build/crypassy/json/
sudo cp -r node_modules/ build/crypassy/node_modules/
sudo cp -r web/ build/crypassy/web/

echo "Copying files finished"

echo "Assigning permissions"
sudo chmod a+rwx build/*
sudo chmod a+rwx build/crypassy/*

echo "========================================"
echo "Build ready!"
echo "Builded to $PWD/build"