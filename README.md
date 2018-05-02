# imagemeta

A simple Lambda script to:

- fetch a supplied image
- if it's a JPG, extract meta data
- return meta data or blank object

## Deployment

In the AWS web console, create a new `Node.js 8` Lambda function. Upload `index.js`.

Add API Gateway input.

## Running

Pass a single `url` parameter in a `GET` request:

```sh
curl 'https://myawsdomain/production/imagemeta?url=http://www.copyrighthub.org/wp-content/uploads/2018/04/IMG_20180409_170638316-1024x768.jpg'
```
