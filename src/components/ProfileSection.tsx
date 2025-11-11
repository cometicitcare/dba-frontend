"use client";
import { BellIcon, MailIcon, SunIcon, LogOutIcon } from "lucide-react";
export function ProfileSection() {
  return (
    <div className="flex items-center gap-4">
      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><SunIcon className="w-5 h-5 text-gray-600" /></button>
      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"><MailIcon className="w-5 h-5 text-gray-600" /><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /></button>
      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"><BellIcon className="w-5 h-5 text-gray-600" /><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /></button>
      <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
        <img src="/image.png" alt="Profile" className="w-10 h-10 rounded-full object-cover" />
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><LogOutIcon className="w-5 h-5 text-gray-600" /></button>
      </div>
    </div>
  );
}