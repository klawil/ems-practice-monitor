export default function Clock() {
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
