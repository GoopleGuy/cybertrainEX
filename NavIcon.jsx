// One stroke system keeps every navigation state visually part of the same HUD.
export default function NavIcon({name}) {
 const paths={
  TRAIN:<path d="M13 2 4 13h7l-1 9 10-13h-7z"/>,
  ARSENAL:<><path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/></>,
  BUILD:<><path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 3v6M16 9v6M10 15v6" strokeWidth="3"/></>,
  DATA:<><path d="M3 3v18h18M7 16v-5M12 16V6M17 16V9"/></>,
  PROTOCOL:<><path d="M8 5h13M8 12h13M8 19h13M3 4v2M3 11v2M3 18v2"/></>
 };
 return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
