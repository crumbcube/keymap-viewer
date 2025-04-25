export const getKeyStyle = (keycode: string): string => {
    if (!keycode) return "bg-gray-300 text-gray-400";
    if (keycode === "ホールド") return "bg-gray-400 text-gray-500";
    if (keycode === "記号") return "bg-blue-100 text-blue-700 font-bold";
    if (keycode === "＝\n記号") return "bg-green-100 text-green-700 font-bold";
    return "bg-white text-black";
  };
  
  export const isLargeSymbol = (keycode: string): boolean => {
    return ["①", "②", "③", "④"].includes(keycode.trim());
  };
  