// Event search and filtering utilities
import { DomainError } from './errors.js';
import { mergeSort } from './sorting.js';

function isValidDate(dateString) {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime());
}

function parseDateInput(input) {
  if (!input) return null;
  if (isValidDate(input)) return new Date(input);
  const dateOnly = isValidDate(input + 'T00:00:00.000Z');
  if (dateOnly) return dateOnly;
  throw new DomainError('VALIDATION', `Invalid date: ${input}`);
}

function isWholeNumber(value) {
  return Number.isInteger(value);
}

function matchesQuery(event, q) {
  if (!q) return true;
  const searchTerm = q.toLowerCase();
  const titleMatch = event.title.toLowerCase().includes(searchTerm);
  const venueMatch = event.venue.toLowerCase().includes(searchTerm);
  return titleMatch || venueMatch;
}

function matchesCity(event, city) {
  if (!city) return true;
  return event.city.toLowerCase() === city.toLowerCase();
}

function matchesDateRange(event, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  
  const eventDate = new Date(event.startsAt);
  
  if (fromDate && eventDate < fromDate) return false;
  
  if (toDate) {
    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);
    if (eventDate > endOfDay) return false;
  }
  
  return true;
}

function matchesMaxPrice(event, maxPriceCents) {
  if (maxPriceCents === undefined) return true;
  if (!event.cheapestPriceCents) return false;
  return event.cheapestPriceCents <= maxPriceCents;
}

function matchesAvailability(event, onlyAvailable) {
  if (!onlyAvailable) return true;
  return event.availableSeats > 0;
}

export function filterEvents(summaries, options = {}) {
  const { q, city, from, to, maxPriceCents, onlyAvailable } = options;
  
  if (from !== undefined && !isValidDate(from)) {
    throw new DomainError('VALIDATION', `Invalid from date: ${from}`);
  }
  if (to !== undefined && !isValidDate(to)) {
    throw new DomainError('VALIDATION', `Invalid to date: ${to}`);
  }
  
  if (maxPriceCents !== undefined && !isWholeNumber(maxPriceCents)) {
    throw new DomainError('VALIDATION', `maxPriceCents must be a whole number: ${maxPriceCents}`);
  }
  
  const fromDate = parseDateInput(from);
  const toDate = parseDateInput(to);
  
  const result = summaries.filter((event) => {
    return matchesQuery(event, q) &&
           matchesCity(event, city) &&
           matchesDateRange(event, fromDate, toDate) &&
           matchesMaxPrice(event, maxPriceCents) &&
           matchesAvailability(event, onlyAvailable);
  });
  
  return result;
}

function compareByDate(a, b) {
  const dateA = new Date(a.startsAt);
  const dateB = new Date(b.startsAt);
  if (dateA.getTime() !== dateB.getTime()) {
    return dateA.getTime() - dateB.getTime();
  }
  if (a.title !== b.title) {
    return a.title.localeCompare(b.title);
  }
  return a.id.localeCompare(b.id);
}

function compareByPrice(a, b) {
  const priceA = a.cheapestPriceCents;
  const priceB = b.cheapestPriceCents;
  
  if (priceA === undefined && priceB === undefined) {
    return compareByTitleId(a, b);
  }
  if (priceA === undefined) return 1;
  if (priceB === undefined) return -1;
  
  if (priceA !== priceB) {
    return priceA - priceB;
  }
  return compareByTitleId(a, b);
}

function compareByAvailability(a, b) {
  if (a.availableSeats !== b.availableSeats) {
    return b.availableSeats - a.availableSeats;
  }
  return compareByTitleId(a, b);
}

function compareByTitleId(a, b) {
  if (a.title !== b.title) {
    return a.title.localeCompare(b.title);
  }
  return a.id.localeCompare(b.id);
}

export function sortEvents(summaries, sortBy) {
  if (!['date', 'price', 'availability'].includes(sortBy)) {
    throw new DomainError('VALIDATION', `Unknown sort option: ${sortBy}`);
  }
  
  const compareFunctions = {
    date: compareByDate,
    price: compareByPrice,
    availability: compareByAvailability,
  };
  
  return mergeSort(summaries, compareFunctions[sortBy]);
}

export function searchEvents(summaries, criteria, sortBy) {
  const filtered = filterEvents(summaries, criteria);
  return sortEvents(filtered, sortBy);
}