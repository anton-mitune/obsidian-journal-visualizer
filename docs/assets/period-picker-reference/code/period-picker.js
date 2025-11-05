/**
 * This component is a generic and reusable date range picker.
 * it is modern, sleek, convenient, and user-friendly.
 * it allows users to select a start and end date for a range.
 * it also has shorthands for common ranges: last week, last month, last quarter, last semester, last year, and all time.
 * 
 * The component has two states:
 * - closed: it shows a previous button, start date, end date, and next button.
 * - open: 
 *      - it shows a list of predefined shorthands on the left side
 *      - a calendar on the right side:
 *        - The calendar is a simple month view, centered on the current month of the end date by default.
 *        - Just above the calendar, there is a header displaying currently displayed month of calendar page, a next and previous button. The next and previous buttons change the month displayed in the calendar, but do not change the start and end date.
 * 
 * When the component is closed, clicking on the start date or end date sets its state to open. Doing so creates an invisible backdrop that covers the whole screen, and the calendar popin appears just below the closed state version.
 * When the component is closed, clicking on the previous or next button changes shifts the date range by as many days as the range's length. It should not open the calendar popin.
 * 
 * When the component is open, clicking on a shorthand sets the start and end date accordingly. It also updates the calendar preview on the right side, so the user can see the selected range.
 * When the component is open, clicking on the invisible backdrop closes the calendar popin and sets the component back to its closed state.
 * When the component is open, clicking on the previous or next button changes the page of the calendar, showing the previous or next month. It does not change the start and end date. The purpose of these buttons is to navigate through the calendar to let user select a date range.
 * When the component is open when clicking on a date in the calendar: 
 *  - if a range is already defined, it unsets the end date, and sets the start date to the clicked date.
 *  - if only a start date is defined
 *     - if the clicked date is before the start date, it sets the start date to the clicked date.
 *     - if the clicked date is after the start date, it sets the end date to the clicked date.
 *  - if no range is defined, it sets the start date to the clicked date
 * 
 * Everytime a complete range is selected (start date and end date are defined), the component emits a custom event `date-range-selected` with the start and end date as detail, and also sets it to the app's store.
 * 
 * For visual consistency, the component should use the same styles as the rest of the application, such as Bootstrap or custom styles.
 * Also abide to the best practices for web components, such as using shadow DOM, encapsulating styles, and handling state management through a store.
 * Also follow GUIDELINES.md, and existing code patterns in the project.
 * 
 * Take good note of the supplied screenshots, as they are the reference for the component's design.
 * - ./attachments/date-range-picker-closed.png
 * - ./attachments/date-range-picker-open_with-current-month-selected.png
 */

import store from "../services/store.js";

class DateRangePicker extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const today = new Date();
    const storeState = store.getState().dateRangePicker || {};

    const start = storeState.startDate || new Date(today.getFullYear(), today.getMonth(), 1);
    const end = storeState.endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.state = {
      open: false,
      startDate: start,
      endDate: end,
      calendarPage: null,
      rangeType: 'month' // default to month
    };
  }

  connectedCallback() {
    this.render();
    this.initEvents();
  }

  disconnectedCallback() {}

  formatDate(date) {
    // dd/mm/yyyy, null-safe
    if (!date) return '—';
    return date.toLocaleDateString('en-GB');
  }

  shiftRange(direction) {
    const { startDate, endDate, rangeType } = this.state;
    if (rangeType === 'month') {
      // Shift by calendar month
      const newStart = new Date(startDate.getFullYear(), startDate.getMonth() + direction, 1);
      const newEnd = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0);
      this.state.startDate = newStart;
      this.state.endDate = newEnd;
    } else if (rangeType === 'quarter') {
      // Shift by calendar quarter
      const q = Math.floor(startDate.getMonth() / 3) + direction;
      const year = startDate.getFullYear() + Math.floor(q / 4);
      const quarter = (q + 4) % 4;
      const newStart = new Date(year, quarter * 3, 1);
      const newEnd = new Date(year, quarter * 3 + 3, 0);
      this.state.startDate = newStart;
      this.state.endDate = newEnd;
    } else if (rangeType === 'year') {
      // Shift by calendar year
      const newStart = new Date(startDate.getFullYear() + direction, 0, 1);
      const newEnd = new Date(startDate.getFullYear() + direction, 11, 31);
      this.state.startDate = newStart;
      this.state.endDate = newEnd;
    } else {
      // Custom: shift by range length in days
      const rangeLength = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      newStart.setDate(newStart.getDate() + direction * rangeLength);
      newEnd.setDate(newEnd.getDate() + direction * rangeLength);
      this.state.startDate = newStart;
      this.state.endDate = newEnd;
    }
    // Also update calendarPage to match new endDate
    let base = this.state.endDate || this.state.startDate || new Date();
    this.state.calendarPage = new Date(base.getFullYear(), base.getMonth(), 1);
    this.render();
    this.initEvents();
    this.emitRange();
  }

  openPicker() {
    // Set calendarPage to endDate, startDate, or today
    let base = this.state.endDate || this.state.startDate || new Date();
    this.state.open = true;
    this.state.calendarPage = new Date(base.getFullYear(), base.getMonth(), 1);
    this.render();
    this.initEvents();
  }

  changeCalendarPage(direction) {
    // direction: -1 for prev, 1 for next
    if (!this.state.calendarPage) {
      let base = this.state.endDate || this.state.startDate || new Date();
      this.state.calendarPage = new Date(base.getFullYear(), base.getMonth(), 1);
    }
    const curr = this.state.calendarPage;
    this.state.calendarPage = new Date(curr.getFullYear(), curr.getMonth() + direction, 1);
    this.render();
    this.initEvents();
  }

  render() {
    const { open, startDate, endDate, calendarPage, rangeType } = this.state;
    // Closed state
    let closedHtml = `
      <div class="drp-row drp-display">
        <button class="drp-btn drp-prev" title="Previous" ${rangeType === 'all' ? ' disabled' : ''}>&#x2039;</button>
        <button class="drp-date drp-start">${this.formatDate(startDate)}</button>
        <span class="drp-arrow">&#x2192;</span>
        <button class="drp-date drp-end">${this.formatDate(endDate)}</button>
        <button class="drp-btn drp-next" title="Next" ${rangeType === 'all' ? ' disabled' : ''}>&#x203A;</button>
      </div>
    `;
    // Open state: backdrop + popin
    let openHtml = '';
    if (open) {
      let calMonth = calendarPage || endDate || startDate || new Date();
      openHtml = `
        <div class="drp-backdrop"></div>
        <div class="drp-popin">
          <div class="drp-popin-body" style="display: flex;">
            <div class="drp-shorthands pe-3" style="width:150px;">
              <ul class="mb-0" style="list-style: none; padding: 0;">
                <li><button class="drp-sh-btn" data-sh="today">Today</button></li>
                <li><button class="drp-sh-btn" data-sh="week">Current week</button></li>
                <li><button class="drp-sh-btn" data-sh="month">Current month</button></li>
                <li><button class="drp-sh-btn" data-sh="quarter">Current quarter</button></li>
                <li><button class="drp-sh-btn" data-sh="year">Current year</button></li>
                <li><button class="drp-sh-btn" data-sh="all">All time</button></li>
              </ul>
            </div>
            <div class="drp-calendar flex-grow-1">
              <div class="drp-calendar-header d-flex justify-content-between align-items-center mb-2">
                <button class="drp-btn drp-prev" title="Previous"${rangeType === 'all' ? ' disabled' : ''}>&#x2039;</button>
                <span class="drp-cal-month">${this.monthLabel(calMonth)}</span>
                <button class="drp-btn drp-next" title="Next"${rangeType === 'all' ? ' disabled' : ''}>&#x203A;</button>
              </div>
              <div class="drp-calendar-body d-flex">
                <div class="drp-cal-col drp-cal-curr">${this.renderMonthCalendar(calMonth)}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    this.shadowRoot.innerHTML = `
      <style>
        .drp-row { display: flex; align-items: center; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
        .drp-btn { background: none; border: none; padding: 0.5em 0.7em; color: #2c3e50; cursor: pointer; }
        .drp-btn:active { background: #f0f0f0; }
        .drp-date { font-family: monospace; font-size:16px; padding: 0.5em 0.7em; cursor: pointer; border: none; background: none; }
        .drp-arrow { color: #2c3e50; padding: 0 0.5em; }
        .drp-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.01); z-index: 1000; }
        .drp-popin { position: absolute; right: 0; top: 30px; background: #fff; border: 1px solid #d1d5db; border-radius: 10px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); z-index: 1010; padding: 0.5em 1em; }
        .drp-shorthands { min-width: 180px; border-right: 1px solid #eee; }
        .drp-sh-title { font-weight: 500; color: #3a4664; font-size: 1em; margin-bottom: 0.5em; }
        .drp-sh-btn { display: block; width: 100%; text-align: left; background: none; border: none; padding: 0.4em 0.2em; color: #2c3e50; font-size: 1em; border-radius: 4px; cursor: pointer; }
        .drp-sh-btn:hover { background: #f0f0f0; }
        .drp-calendar { min-width: 340px; }
        .drp-calendar-header { font-weight: 500; color: #3a4664; font-size: 1em; margin-bottom: 0.5em; }
        .drp-calendar-body { gap: 1em; }
        .drp-cal-col { background: #fafbfc; border-radius: 8px; padding: 0.5em; min-width: 150px; }
        .drp-cal-table { width: 100%; border-collapse: collapse; text-align: center; }
        .drp-cal-table th { color: #7a869a; font-weight: 400; font-size: 0.95em; padding: 0.2em 0; }
        .drp-cal-table td { padding: 0.2em 0; border-radius: 4px; cursor: pointer; }
        .drp-cal-table td.drp-out { color: #b0b0b0; background: none; cursor: default; }
        .drp-cal-table td.drp-in-range { background: #e6f0fa; }
        .drp-cal-table td.drp-selected { background: #3a4664; color: #fff; font-weight: 500; }
      </style>
      ${closedHtml}
      ${openHtml}
    `;
  }

  monthLabel(date) {
    return date.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
  }

  renderMonthCalendar(monthDate) {
    // monthDate: first day of month
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() || 7; // Monday=1, Sunday=7
    let html = '<table class="drp-cal-table"><thead><tr>';
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    for (const d of days) html += `<th>${d}</th>`;
    html += '</tr></thead><tbody><tr>';
    let day = 1;
    let col = 1;
    // Fill empty cells before first day
    for (; col < startDay; col++) html += '<td class="drp-out"></td>';
    // Fill days
    const { startDate, endDate } = this.state;
    for (; day <= lastDay.getDate(); day++, col++) {
      const d = new Date(year, month, day);
      let cls = '';
      if (startDate && d.toDateString() === startDate.toDateString()) cls += ' drp-selected';
      if (endDate && d.toDateString() === endDate.toDateString()) cls += ' drp-selected';
      if (startDate && endDate && d > startDate && d < endDate) cls += ' drp-in-range';
      html += `<td class="drp-day${cls}" data-date="${d.toISOString()}">${day}</td>`;
      if (col % 7 === 0 && day !== lastDay.getDate()) html += '</tr><tr>';
    }
    // Fill empty cells after last day
    for (; col % 7 !== 1; col++) html += '<td class="drp-out"></td>';
    html += '</tr></tbody></table>';
    return html;
  }

  initEvents() {
    // Closed state events
    this.shadowRoot.querySelector('.drp-display .drp-prev').onclick = () => this.shiftRange(-1);
    this.shadowRoot.querySelector('.drp-display .drp-next').onclick = () => this.shiftRange(1);
    this.shadowRoot.querySelector('.drp-display .drp-start').onclick = () => this.openPicker();
    this.shadowRoot.querySelector('.drp-display .drp-end').onclick = () => this.openPicker();
    // Open state events
    if (this.state.open) {
      // Backdrop closes popin
      this.shadowRoot.querySelector('.drp-backdrop').onclick = () => {
        this.state.open = false;
        this.render();
        this.initEvents();
      };
      // Popin prev/next
      this.shadowRoot.querySelector('.drp-popin .drp-prev').onclick = () => this.changeCalendarPage(-1);
      this.shadowRoot.querySelector('.drp-popin .drp-next').onclick = () => this.changeCalendarPage(1);
      // Calendar day click events
      this.shadowRoot.querySelectorAll('.drp-day').forEach(td => {
        td.onclick = (e) => {
          const date = new Date(td.getAttribute('data-date'));
          this.handleDateClick(date);
        };
      });
      // Shorthand click events
      this.shadowRoot.querySelectorAll('.drp-sh-btn').forEach(btn => {
        btn.onclick = () => {
          this.handleShorthand(btn.getAttribute('data-sh'));
        };
      });
    }
  }

  handleShorthand(shorthand) {
    const today = new Date();
    let start, end, rangeType = 'custom';
    switch (shorthand) {
      case 'today':
        start = end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        rangeType = 'custom';
        break;
      case 'week': {
        const day = today.getDay() || 7;
        start = new Date(today);
        start.setDate(today.getDate() - day + 1);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        rangeType = 'custom';
        break;
      }
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        rangeType = 'month';
        break;
      case 'quarter': {
        const q = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), q * 3, 1);
        end = new Date(today.getFullYear(), q * 3 + 3, 0);
        rangeType = 'quarter';
        break;
      }
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        rangeType = 'year';
        break;
      case 'prev-week': {
        const day = today.getDay() || 7;
        end = new Date(today);
        end.setDate(today.getDate() - day);
        start = new Date(end);
        start.setDate(end.getDate() - 6);
        rangeType = 'custom';
        break;
      }
      case 'prev-month': {
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
        end = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
        rangeType = 'month';
        break;
      }
      case 'prev-quarter': {
        const q = Math.floor(today.getMonth() / 3) - 1;
        const year = q < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const quarter = (q + 4) % 4;
        start = new Date(year, quarter * 3, 1);
        end = new Date(year, quarter * 3 + 3, 0);
        rangeType = 'quarter';
        break;
      }
      case 'all':
        start = null;
        end = null;
        rangeType = 'custom';
        break;
      default:
        return;
    }
    this.state.startDate = start;
    this.state.endDate = end;
    this.state.rangeType = rangeType;
    let base = end || start || new Date();
    this.state.calendarPage = base ? new Date(base.getFullYear(), base.getMonth(), 1) : new Date();
    this.render();
    this.initEvents();
    this.emitRange();
    this.render();
    this.initEvents();
  }

  handleDateClick(date) {
    const { startDate, endDate } = this.state;
    if (startDate && endDate) {
      this.state.startDate = date;
      this.state.endDate = null;
      this.state.rangeType = 'custom';
    } else if (startDate && !endDate) {
      if (date < startDate) {
        this.state.startDate = date;
        this.state.rangeType = 'custom';
      } else if (date > startDate) {
        this.state.endDate = date;
        this.state.rangeType = 'custom';
        this.emitRange();
      } else {
        // Same as start, do nothing
      }
    } else {
      this.state.startDate = date;
      this.state.rangeType = 'custom';
    }
    this.render();
    this.initEvents();
  }

  emitRange() {
    if (this.state.startDate && this.state.endDate) {
      this.dispatchEvent(new CustomEvent('date-range-selected', {
        detail: { start: this.state.startDate, end: this.state.endDate },
        bubbles: true,
        composed: true
      }));
      store.setState({
        dateRangePicker: { ...this.state }
      });
    }
  }
}
customElements.define('date-range-picker', DateRangePicker);
export default DateRangePicker;
