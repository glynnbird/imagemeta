// fetch a URL
const request = function(url) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response) => {
      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }
      var body =  Buffer.from([]);
      response.on('data', (chunk) => { body = Buffer.concat([body, chunk]) });
      response.on('end', () => resolve(body));
    });
    // handle connection errors of the request
    request.on('error', (err) => reject(err))
    })
};

/*
IPTC code from exif.js (https://github.com/jseidelin/exif-js).
The MIT License (MIT)
Copyright (c) 2008 Jacob Seidelin
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function findInJPEG(file) {
  var dataView = new DataView(file);

  if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
      return false; // not a valid jpeg
  }

  var offset = 2,
      length = file.byteLength;


  var isFieldSegmentStart = function(dataView, offset){
      return (
          dataView.getUint8(offset) === 0x38 &&
          dataView.getUint8(offset+1) === 0x42 &&
          dataView.getUint8(offset+2) === 0x49 &&
          dataView.getUint8(offset+3) === 0x4D &&
          dataView.getUint8(offset+4) === 0x04 &&
          dataView.getUint8(offset+5) === 0x04
      );
  };

  while (offset < length) {
      if ( isFieldSegmentStart(dataView, offset )){
          // Get the length of the name header (which is padded to an even number of bytes)
          var nameHeaderLength = dataView.getUint8(offset+7);
          if(nameHeaderLength % 2 !== 0) nameHeaderLength += 1;
          // Check for pre photoshop 6 format
          if(nameHeaderLength === 0) {
              // Always 4
              nameHeaderLength = 4;
          }

          var startOffset = offset + 8 + nameHeaderLength;
          var sectionLength = dataView.getUint16(offset + 6 + nameHeaderLength);

          return readIPTCData(file, startOffset, sectionLength);
      }
      // Not the marker, continue searching
      offset++;
  }
}
var IptcFieldMap = {
  0x78 : 'caption',
  0x6E : 'credit',
  0x19 : 'keywords',
  0x37 : 'dateCreated',
  0x50 : 'byline',
  0x55 : 'bylineTitle',
  0x7A : 'captionWriter',
  0x69 : 'headline',
  0x74 : 'copyright',
  0x0F : 'category'
};

function readIPTCData(file, startOffset, sectionLength){
  var dataView = new DataView(file);
  var data = {};
  var fieldValue, fieldName, dataSize, segmentType, segmentSize;
  var segmentStartPos = startOffset;
  while(segmentStartPos < startOffset+sectionLength) {
      if(dataView.getUint8(segmentStartPos) === 0x1C && dataView.getUint8(segmentStartPos+1) === 0x02){
          segmentType = dataView.getUint8(segmentStartPos+2);
          if(segmentType in IptcFieldMap) {
              dataSize = dataView.getInt16(segmentStartPos+3);
              segmentSize = dataSize + 5;
              fieldName = IptcFieldMap[segmentType];
              fieldValue = getStringFromDB(dataView, segmentStartPos+5, dataSize);
              // Check if we already stored a value with this name
              if(data.hasOwnProperty(fieldName)) {
                  // Value already stored with this name, create multivalue field
                  if(data[fieldName] instanceof Array) {
                      data[fieldName].push(fieldValue);
                  }
                  else {
                      data[fieldName] = [data[fieldName], fieldValue];
                  }
              }
              else {
                  data[fieldName] = fieldValue;
              }
          }

      }
      segmentStartPos++;
  }
  return data;
}

function getStringFromDB(buffer, start, length) {
  var outstr = "";
  for (n = start; n < start+length; n++) {
      outstr += String.fromCharCode(buffer.getUint8(n));
  }
  return outstr;
}
////////////////////////////////////////////////////////////////

function toArrayBuffer(buffer) {
  var ab = new ArrayBuffer(buffer.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
  }
  return ab;
}

// main 
exports.handler = function(event, context, callback) {
  var qs = event['queryStringParameters'];
  if (!qs.url) {
    throw new Error('missing url parameter');
  }
  request(qs.url).then(function(b) {
    var ab = toArrayBuffer(b);
    var meta = findInJPEG(ab) || {};
    callback(null, { 
      statusCode: 200, 
      headers: { 'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify(meta) 
    });
  }).catch(function(e) {
    console.error(e);
    throw new Error(e);
  });
};;