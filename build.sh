echo "Building started..."

nexe index.js --build --verbose

echo "Copying files to final location..."

sudo rm -rf build/
sudo mkdir build/
sudo mkdir build/data/

sudo cp crypassy build/crypassy
sudo cp data/mimes.dat build/data/mimes.dat
sudo cp -r json/ build/json/
sudo cp -r node_modules/ build/node_modules/
sudo cp -r web/ build/web/

echo "Copying files finished"

echo "Assigning permissions"
sudo chmod a+rwx build/

echo "========================================"
echo "Build ready!"
echo "Builded to $PWD/build"