import jsSHA from 'jssha';

const getAuthorizationHeader = function () {
  const AppID = import.meta.env.VITE_MOTC_APP_ID;
  const AppKey = import.meta.env.VITE_MOTC_APP_KEY;

  const GMTString = new Date().toGMTString();
  const ShaObj = new jsSHA('SHA-1', 'TEXT');
  ShaObj.setHMACKey(AppKey, 'TEXT');
  ShaObj.update('x-date: ' + GMTString);
  const HMAC = ShaObj.getHMAC('B64');
  const Authorization = `hmac username="${AppID}", algorithm="hmac-sha1", headers="x-date", signature="${HMAC}"`;

  return { Authorization: Authorization, 'X-Date': GMTString };
};

export default getAuthorizationHeader;