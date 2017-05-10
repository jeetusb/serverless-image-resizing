'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const Sharp = require('sharp');

const BUCKET = process.env.BUCKET;
const URL = process.env.URL;

exports.handler = function(event, context, callback) {
  var originalKey = event.queryStringParameters.key;
  
  if( typeof event.queryStringParameters.w !== 'undefined'){
      var width = parseInt(event.queryStringParameters.w);
  }
  if( typeof event.queryStringParameters.h !== 'undefined'){
      var height = parseInt(event.queryStringParameters.h);
  }
  
if(typeof originalKey !== 'undefined' && originalKey !== "" && (!isNaN(height) || !isNaN(width))){
        var key=originalKey;
        if(!isNaN(height) && height){
          key +=";h="+height;
        }
        
        if(!isNaN(width) && width){
            key +=";w="+width;
        }
        
        S3.getObject({Bucket: BUCKET, Key: originalKey}).promise()
    .then(data => Sharp(data.Body)
      .resize(width, height)
      .toFormat('png')
      .toBuffer()
    )
    .then(buffer => S3.putObject({
        Body: buffer,
        Bucket: BUCKET,
        ContentType: 'image/png',
        CacheControl: 'max-age=86400',
        Key: key,
      }).promise()
    )
    .then(() => callback(null, {
        statusCode: '301',
        headers: {'location': `${URL}/${key}`},
        body: '',
      })
    )
    .catch(err => callback(err))

}else{
  // redirect to original image, if proper format is not passed.
  var fallbackURI = false;
    
    // exclude other characters after image extension (.jpg,.gif)
    function getFallbackURI(originalKey,extension){
        var fallbackURI = false;
        var arr = originalKey.split(extension);
        if(originalKey.split(extension).length > 1)
        {
            fallbackURI = arr[0]+extension;
        }
        return fallbackURI;
    }
    
    var extensionArr = ['.jpg','.jpeg','.png','.gif'];
    for(var i = 0, len = extensionArr.length; i < len; i++) {
        fallbackURI = getFallbackURI(originalKey,extensionArr[i]);
        if(fallbackURI !== false) {
            break;
        }
    }

    if(fallbackURI !== false) {
         callback(null, {
         statusCode: '301',
         headers: {'location': `${URL}/${fallbackURI}`},
         body: '',
      })   
    }else{
        callback(null, {
         body: 'Bad Request',
      });
    }
} 

}