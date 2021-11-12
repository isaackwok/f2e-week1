import jsSHA from 'jssha';

const getAuthorizationHeader = function () {
  var AppID = '947333329b9a4c99adc478a8c12c3aa3';
  var AppKey = 'Fuzve_DoP8ReM3KD_-12cYjq8_8';

  var GMTString = new Date().toGMTString();
  var ShaObj = new jsSHA('SHA-1', 'TEXT');
  ShaObj.setHMACKey(AppKey, 'TEXT');
  ShaObj.update('x-date: ' + GMTString);
  var HMAC = ShaObj.getHMAC('B64');
  var Authorization = `hmac username="${AppID}", algorithm="hmac-sha1", headers="x-date", signature="${HMAC}"`;

  return { Authorization: Authorization, 'X-Date': GMTString };
};

export default getAuthorizationHeader;