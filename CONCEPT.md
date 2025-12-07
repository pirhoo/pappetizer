# Pappertizer

Pappetizer is a node.js program to rename receipts files in a directory correctly.

This CLI walk the entire tree of a given directory and for each file:

* read the content of the file (PDF or images)
* OCR any image (even embedded image)
* detect name of the vendor
* detect the date the receipt was emitted
* detect the amount
* detect the currency
* rename the file according to size format (customizable): `<YYYY><MM><DD> - <VENDOR> - <AMOUNT> <CURRENCY>.<EXT>`
* the currency is always written in 3 let (DOL, EUR, CHF, etc)
* save an hidden `.pappetizer.json` manifest file in each directory that keep track of any renaming performed
* each file is renamed once (according to the .pappertizer.json manifest)
* when starting to rename file in a directory, user is prompted for each file
* in the prompt user can choose between: 1) accepting the suggestion 2) accepting all suggestions in this directory 3) enter a name manualy

## Stack

* Node.js
* Commander
* ESLint 
* Jest
* Hexagonal Architecture
* Tesseract for OCR


