"use client";

import { useState } from "react";

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const renderHeader = () => (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.setMonth(currentDate.getMonth() - 1))
            )
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-xl">chevron_left</span>
        </button>
        <p className="text-slate-900 dark:text-white text-base font-bold leading-tight w-32 text-center">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </p>
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.setMonth(currentDate.getMonth() + 1))
            )
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-xl">
            chevron_right
          </span>
        </button>
      </div>
    </div>
  );

  const renderDays = () => (
    <div className="grid grid-cols-7">
      {daysOfWeek.map((day) => (
        <div
          key={day}
          className="border-r border-slate-200 dark:border-slate-800 p-3 text-center"
        >
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">
            {day}
          </p>
        </div>
      ))}
    </div>
  );

  const renderCells = () => {
    // Basic calendar grid implementation - not a fully functional calendar
    const monthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - monthStart.getDay());
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        days.push(
          <div
            key={day.toString()}
            className="p-3 text-center border-r border-b border-slate-200 dark:border-slate-800"
          >
            <p
              className={
                day.getMonth() !== currentDate.getMonth()
                  ? "text-slate-400"
                  : ""
              }
            >
              {day.getDate()}
            </p>
          </div>
        );
        day.setDate(day.getDate() + 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark overflow-hidden">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};

export default Calendar;
