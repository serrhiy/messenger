'use strict';

const options = { hour: 'numeric', minute: 'numeric', hour12: true };

const transformDate = (date = new Date()) => {
  const instance = date instanceof Date;
  if (!instance) return transformDate(new Date(date));
  return date.toLocaleString('en-US', options);
};

export default transformDate;
