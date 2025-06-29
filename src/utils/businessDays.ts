
import { addDays, differenceInDays, isWeekend, format } from 'date-fns';

// Common US holidays - you can expand this list as needed
const getHolidays = (year: number) => {
  return [
    new Date(year, 0, 1), // New Year's Day
    new Date(year, 0, 15), // Martin Luther King Jr. Day (3rd Monday in January)
    new Date(year, 1, 19), // Presidents Day (3rd Monday in February)
    new Date(year, 4, 27), // Memorial Day (last Monday in May)
    new Date(year, 6, 4), // Independence Day
    new Date(year, 8, 2), // Labor Day (1st Monday in September)
    new Date(year, 9, 14), // Columbus Day (2nd Monday in October)
    new Date(year, 10, 11), // Veterans Day
    new Date(year, 10, 28), // Thanksgiving (4th Thursday in November)
    new Date(year, 11, 25), // Christmas Day
  ];
};

export const isHoliday = (date: Date) => {
  const holidays = getHolidays(date.getFullYear());
  return holidays.some(holiday => 
    holiday.getDate() === date.getDate() && 
    holiday.getMonth() === date.getMonth() &&
    holiday.getFullYear() === date.getFullYear()
  );
};

export const isBusinessDay = (date: Date) => {
  return !isWeekend(date) && !isHoliday(date);
};

export const addBusinessDays = (startDate: Date, businessDays: number): Date => {
  if (businessDays === 0) return startDate;
  
  let currentDate = new Date(startDate);
  let remainingDays = Math.abs(businessDays);
  const direction = businessDays > 0 ? 1 : -1;
  
  while (remainingDays > 0) {
    currentDate = addDays(currentDate, direction);
    if (isBusinessDay(currentDate)) {
      remainingDays--;
    }
  }
  
  return currentDate;
};

export const getBusinessDaysBetween = (startDate: Date, endDate: Date): number => {
  const totalDays = Math.abs(differenceInDays(endDate, startDate));
  let businessDays = 0;
  
  const earlierDate = startDate < endDate ? startDate : endDate;
  
  for (let i = 0; i <= totalDays; i++) {
    const currentDate = addDays(earlierDate, i);
    if (isBusinessDay(currentDate)) {
      businessDays++;
    }
  }
  
  return businessDays;
};

export const calculateTaskEndDate = (startDate: Date, durationInBusinessDays: number): Date => {
  return addBusinessDays(startDate, durationInBusinessDays - 1); // -1 because start date counts as day 1
};
