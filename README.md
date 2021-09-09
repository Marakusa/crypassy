# Crypassy
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
cd crypassy
./build.sh
```
### Windows
Building for Windows is possible, but I haven't created a shell script for it yet :P
```
No supported build script yet...
```
