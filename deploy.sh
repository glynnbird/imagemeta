#!/bin/bash
Z="imagemeta.zip"
NAME="imagemeta"
zip "$Z" index.js
aws lambda update-function-code --function-name "$NAME" --zip-file "fileb://$Z"
rm "$Z"