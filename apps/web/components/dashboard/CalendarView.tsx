"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export function CalendarView() {
  return (
    <div className="fc-serpio">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="tr"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{
          today: "Bugün",
          month: "Ay",
          week: "Hafta",
          day: "Gün",
        }}
        events={[]}
        eventClick={(info) => {
          console.log("Event clicked:", info.event);
        }}
        height="auto"
        dayMaxEvents={3}
      />
    </div>
  );
}
