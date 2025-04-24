export const getKeyStyle = (keycode: string): string => {
    if (!keycode) return "bg-gray-300 text-gray-400";
    if (keycode === "ホールド") return "bg-gray-400 text-gray-500";
    if (keycode === "後押し") return "bg-blue-100 text-blue-700 font-bold";
    if (keycode === "先押し") return "bg-green-100 text-green-700 font-bold";
    if (keycode === "=\n先押し" || keycode === "＝\n先押し") return "bg-green-100 text-green-700 font-bold";
    return "bg-white text-black";
  };
  
  export const isLargeSymbol = (keycode: string): boolean => {
    return ["①", "②", "③", "④"].includes(keycode.trim());
  };
  