# ![132775700-a89da45c-2873-4a51-83ac-6e56a256a437](https://user-images.githubusercontent.com/29477753/132776086-60753733-dc54-4502-be46-cfd290aeea06.png)

Manage passwords from your USB stick safely.

Crypassy encrypts your data with your login username and password hashes. If your USB stick gets stolen, the data is hard to decrypt.

# Build
You can download the pre-builds from https://github.com/Marakusa/crypassy/releases or you can build the binaries yourself with these instructions below.

## Dependencies
You have to have `Node.js` and `nexe` installed on your computer.
### Node.js
Download Node.js from the official website https://nodejs.org/en/download/ and follow the instructions for your operating system.
### nexe
Nexe https://github.com/nexe/nexe is a command-line utility that compiles your Node.js application into a single executable file.
```
npm i nexe -g
```
## Building
### Linux
```
git clone https://github.com/Marakusa/crypassy.git
cd crypassy/
./build.sh
```
To start the app run these commands:
```
cd build/crypassy/
./crypassy
```
And then go to http://127.0.0.1:8800 in your internet browser.
### Windows
Building for Windows is possible, but I haven't created a shell script for it yet :P
```
No supported build script yet...
```
