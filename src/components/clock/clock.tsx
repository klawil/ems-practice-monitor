import { useState, useEffect } from 'react';

export default function Clock() {
  // const [currentTime, setTime] = useState('');

  // useEffect(() => {
  //   setInterval(() => {
  //     const dateObj = new Date();
  //     const hour = dateObj.getHours().toString().padStart(2, '0');
  //     const minute = dateObj.getMinutes().toString().padStart(2, '0');
  //     const seconds = dateObj.getSeconds().toString().padStart(2, '0');

  //     setTime(`${hour}:${minute}:${seconds}`);
  //   }, 1000 / 30);
  // }, []);
      
  const dateObj = new Date();
  const hour = dateObj.getHours().toString().padStart(2, '0');
  const minute = dateObj.getMinutes().toString().padStart(2, '0');
  const seconds = dateObj.getSeconds().toString().padStart(2, '0');

  return (
    <>
      {`${hour}:${minute}:${seconds}`}
    </>
  )
}
