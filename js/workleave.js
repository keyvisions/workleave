/**
 * @file Workleave management
 * @author Giancarlo Trevisan <g.trevisan@keyvisions.it>
 * @version 1.0
 */

let workleave = (function(options) {
  let _r, _n, _request, _calendar, _year, _employee, _type, _fromDate, _toDate;

  function loadCalendar(id, locale, year) {
    _employee = document.querySelector('[name="Employee"]');
    _type = document.querySelector('[name="Type"]');
    _fromDate = document.querySelector('[name="FromDate"]');
    _toDate = document.querySelector('[name="ToDate"]');

    _year = year || (new Date()).getFullYear();

    let d = new Date(_year, 0, 1),
      month = 0,
      monthsHeader = '',
      daysHeader = '',
      days = '';

    do {
      let rule = '';
      if (d.getDay() === 0 || d.getDay() === 6) {
        rule = ' class="type5"';
      } else if (calendarRules.findIndex(el => {
          return el.fromdate <= d.getTime() && d.getTime() <= el.todate
        }) !== -1) {
        rule = ` class="${calendarRules[calendarRules.findIndex(el => { return el.fromdate <= d.getTime() && d.getTime() <= el.todate })].type}"`;
      }
      daysHeader += `<th${rule}><div>${d.toLocaleDateString(locale, { weekday: 'narrow' })}</div>${d.getDate()}</th>`;
      days += `<td${rule}>&#8195;</td>`;

      d.setDate(d.getDate() + 1);

      if (month !== d.getMonth()) {
        var lastDay = new Date(d.getTime() - 1);
        monthsHeader += `<th colspan="${lastDay.getDate()}">${lastDay.toLocaleDateString(locale, { year: 'numeric', month: 'long' })}</th>`;
        ++month;
      }
    } while (month < 12);

    let str =
      `<table class="year">
      <thead><tr class="months"><th>Permessi e Ferie</th>${monthsHeader}</tr><tr class="days"><th>Dipendente</th>${daysHeader}</tr></thead>
      <tbody onmousedown="workleave.select(event)" onmousemove="workleave.select(event)" onmouseup="workleave.select(event)">`;

    let types = '';
    if (options.summary)
      document.querySelectorAll('[name="Type"] option').forEach(option =>
        types += `<span class="${option.value}">&#8195;</span> `);
    let unit = '';
    employees.forEach(employee => {
      if (unit !== employee.unit) {
        unit = employee.unit;
        str += `<tr class="unit"><th>${employee.unit}</th><th colspan="${dayOfYear(new Date(_year, 11, 31)) + 1}"></th></tr>`;
      }
      str += `<tr data-id="${employee.id}"><th>${types}${employee.name}</th>${days}</tr>`;
      _employee.innerHTML += `<option value="${employee.id}">${employee.name}</option>`;
    });

    str += '</tbody></table>';

    _calendar = document.getElementById(id);
    _calendar.setAttribute('tabindex', '0');
    _calendar.addEventListener('keydown', syncRequest);
    _calendar.innerHTML = str;

    d = _calendar.querySelector('tr:nth-child(2)').children[dayOfYear(new Date()) + 1];
    d.classList.add('today');
    d.previousSibling.scrollIntoView();
    _calendar.scrollTop = 0;
    //_calendar.scrollLeft += _calendar.offsetWidth - _calendar.querySelector('th').offsetWidth; // Should offset to middle of page

    employees.forEach(employee => {
      employee.requests.forEach(request => drawRequest(employee.id, request));
    });
  }

  function syncRequest(e) {
    let requestType = _type.value;

    if (e.currentTarget.tagName === 'DIV') {
      e.preventDefault();

      if (e.key === 'Insert' && document.getElementById('btnAdd').style.display === '') {
        document.getElementById('btnAdd').click();
        return;
      } else if (e.key === 'Insert' && document.getElementById('btnApprove').style.display === '') {
        document.getElementById('btnApprove').click();
        return;
      } else if (e.key === 'Delete' && document.getElementById('btnDelete').style.display === '') {
        document.getElementById('btnDelete').click();
        return;
      }

      if (e.shiftKey && (requestType === 'type1' || requestType === 'type2'))
        _type.value = requestType = 'type3'; // _ferie
      else if (!e.shiftKey && (requestType !== 'type1' && requestType !== 'type2'))
        _type.value = requestType = 'type1'; // _permesso
    }

    _employee.setAttribute('required', (requestType === 'type1' || requestType === 'type2' || requestType === 'type4') ? 'true' : 'false');

    let fromdate = _fromDate.value,
      todate = _toDate.value;

    _fromDate.setAttribute('type', (requestType === 'type1' || requestType === 'type2') ? 'datetime-local' : 'date');
    _toDate.setAttribute('type', (requestType === 'type1' || requestType === 'type2') ? 'time' : 'date');

    if (!_fromDate.value)
      _fromDate.value = _fromDate.getAttribute('type') === 'date' ? fromdate.substr(0, 10) : fromdate.substr(0, 10) + 'T08:00';
    if (!_toDate.value)
      _toDate.value = _toDate.getAttribute('type') === 'date' ? fromdate.substr(0, 10) : '10:00';

    if (e.currentTarget.tagName === 'DIV') {
      if (e.key === 'ArrowDown') {
        let i = _employee.selectedIndex;
        ++_employee.selectedIndex; // Next employee
        if (_employee.selectedIndex === -1)
          _employee.selectedIndex = i;
      } else if (e.key === 'ArrowUp' && _employee.selectedIndex > 1) {
        --_employee.selectedIndex; // Previous employee
      } else if (e.key === 'ArrowLeft') {
        if (!e.shiftKey)
          _fromDate.value = addDays(_fromDate.value, -1).substr(0, _fromDate.getAttribute('type') === 'date' ? 10 : 16);
        else if (_toDate.getAttribute('type') === 'date')
          _toDate.value = addDays(_toDate.value, -1).substr(0, 10);
      } else if (e.key === 'ArrowRight') {
        if (!e.shiftKey)
          _fromDate.value = addDays(_fromDate.value, 1).substr(0, _fromDate.getAttribute('type') === 'date' ? 10 : 16);
        else if (_toDate.getAttribute('type') === 'date')
          _toDate.value = addDays(_toDate.value, 1).substr(0, 10);
      } else if (e.key === 'Home')
        if (e.shiftKey)
          _toDate.value = `${_year}-01-01`;
        else
          _fromDate.value = (_fromDate.getAttribute('type') === 'date') ? `${_year}-01-01` : `${_year}-01-01T00:00`;
      else if (e.key === 'End')
        if (e.shiftKey)
          _toDate.value = `${_year}-12-31`;
        else
          _fromDate.value = (_fromDate.getAttribute('type') === 'date') ? `${_year}-12-31` : `${_year}-12-31T08:00`;
    }

    _calendar.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    // If part of a request was selected select the whole request
    if (new Date(_fromDate.value) instanceof Date && !isNaN(new Date(_fromDate.value).valueOf())) {
      let fromdate = new Date(_fromDate.value),
        todate = new Date(_toDate.getAttribute('type') === 'date' ?
          _toDate.value : _fromDate.value.substr(0, 10) + 'T' + _toDate.value);

      let employee = employees.find(employee => {
        return employee.id == _employee.value;
      });
      if (employee) {
        let d = new Date(fromdate);
        if (fromdate > todate)
          fromdate = todate, todate = new Date(d);
        do {
          _request = employee.requests.find(request => {
            return request.status !== 3 && new Date(request.fromdate).setHours(0, 0, 0, 0) <= d && d <= new Date(request.todate).setHours(23, 59, 59, 999);
          });
          d.setDate(d.getDate() + 1);
        } while (!_request && d <= todate);
        if (!_request) {
          _request = {
            fromdate: fromdate,
            todate: todate,
            type: '',
            status: 1
          };
        } else {
          _fromDate.value = (_fromDate.getAttribute('type') === 'date') ? _request.fromdate.substr(0, 10) : _request.fromdate.substr(0, 16);
          _toDate.value = (_toDate.getAttribute('type') === 'date') ? _request.todate.substr(0, 10) : _request.todate.substr(11, 5);
          document.getElementById('btnAdd').style.display = 'none';
          document.getElementById('btnApprove').style.display = '';
          document.getElementById('btnDelete').style.display = '';
          setRequest(_request.type);
        }
        let td = drawRequest(employee.id, _request, 1);
        if (td) {
          td.scrollIntoView();
          _calendar.scrollLeft -= _calendar.querySelector('th').offsetWidth;
        }
      }
    }
  }

  function setRequest(requestType, fromdate) {
    _employee.setAttribute('required', (requestType === 'type1' || requestType === 'type2' || requestType === 'type4') ? 'true' : 'false');
    _type.value = requestType;
    _fromDate.setAttribute('type', (requestType === 'type1' || requestType === 'type2') ? 'datetime-local' : 'date');
    _toDate.setAttribute('type', (requestType === 'type1' || requestType === 'type2') ? 'time' : 'date');

    if (fromdate) {
      _fromDate.value = new Date(fromdate).toISOString().substr(0, 10) + (_fromDate.getAttribute('type') === 'date' ? '' : 'T08:00');
      _toDate.value = document.querySelector('[name="ToDate"]').getAttribute('type') === 'date' ? new Date(fromdate).toISOString().substr(0, 10) : '10:00';
    }
    if (!_fromDate.value)
      _calendar.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
  }

  function selectRequest(e) {
    if (e.type === 'mousedown') {
      _calendar.focus();
      _r = e.target.parentElement;
      _employee.value = _r.getAttribute('data-id');

      document.getElementById('btnAdd').style.display = '';
      document.getElementById('btnApprove').style.display = 'none';
      document.getElementById('btnDelete').style.display = 'none';

      document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    }

    let n = e.target.cellIndex;

    if (_r && n > 0) {
      let d = new Date(`${_year}-01-01T00:00:00.000Z`);
      d.setDate(d.getDate() + n - 0.5);

      // If part of a request was selected select the whole request
      _request = employees.find(employee => {
        return employee.id == _r.getAttribute('data-id');
      }).requests.find(request => {
        return request.status !== 3 && new Date(request.fromdate).setHours(0, 0, 0, 0) <= d && d <= new Date(request.todate).setHours(23, 59, 59, 999);
      });

      if (_request) {
        setRequest(_request.type);
        _fromDate.value = (_fromDate.getAttribute('type') === 'date') ? _request.fromdate.substr(0, 10) : _request.fromdate.substr(0, 16);
        _toDate.value = (_toDate.getAttribute('type') === 'date') ? _request.todate.substr(0, 10) : _request.todate.substr(11, 5);
        drawRequest(_r.getAttribute('data-id'), _request, 1);
        document.getElementById('btnAdd').style.display = 'none';
        document.getElementById('btnApprove').style.display = '';
        document.getElementById('btnDelete').style.display = '';
        _r = null;
      } else if (e.type === 'mousedown') {
        e.target.classList.add('selected');
        _n = n + 1;
        _fromDate.value = d.toISOString().substr(0, 10) + (_fromDate.getAttribute('type') === 'date' ? '' : 'T08:00');
        _toDate.value = (_toDate.getAttribute('type') === 'date' ? _fromDate.value : '10:00');
      } else if ((e.type === 'mousemove' && e.buttons === 1)) {
        if (_toDate.getAttribute('type') !== 'date')
          setRequest('type3', _fromDate.value.substr(0, 10));

        _toDate.value = d.toISOString().substr(0, 10);
        _r.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

        if (_n <= n)
          for (let i = _n - 1; i <= n; ++i)
            _r.children[i].classList.add('selected');
        else
          for (let i = n; i < _n; ++i)
            _r.children[i].classList.add('selected');
      }

      if (options.summary)
        document.querySelectorAll('[name="Type"] option').forEach(option =>
          _r.children[0].innerHTML += `<span class="${option.value}">${_r.querySelectorAll('.' + option.value).length}</span>`);
    }
    if (e.type === 'mouseup') {
      if (_fromDate.value === _toDate.value && _toDate.getAttribute('type') === 'date')
        setRequest('type1', _fromDate.value);
      _r = null;
    }

    e.preventDefault();
  }

  function manageRequest(action) {
    let employee = employees.find(el => {
      return el.id == _employee.value
    });

    if (employee) {
      switch (action) {
        case 'btnAdd':
          _request = {
            fromdate: new Date(_fromDate.value).toISOString(),
            todate: new Date(document.querySelector('[name="ToDate"]').getAttribute('type') === 'date' ?
              document.querySelector('[name="ToDate"]').value : _fromDate.value.substr(0, 10) + 'T' + (document.querySelector('[name="ToDate"]').value || '00:00')).toISOString(),
            type: _type.value,
            status: 1
          };
          if (_request.fromdate > _request.todate) {
            let tmp = _request.fromdate;
            _request.fromdate = _request.todate;
            _request.todate = tmp;
          };
          employee.requests.unshift(_request);
          document.getElementById('btnAdd').style.display = 'none';
          document.getElementById('btnApprove').style.display = '';
          document.getElementById('btnDelete').style.display = '';
          break;
        case 'btnApprove':
          _request.status = _request.status === 1 ? 2 : 1;
          break;
        case 'btnDelete':
          _request.status = 3;
          let i = employee.requests.findIndex(request => {
            return request = _request;
          });
          if (i > -1)
            employee.requests.splice(i, 1);
          document.getElementById('btnAdd').style.display = '';
          document.getElementById('btnApprove').style.display = 'none';
          document.getElementById('btnDelete').style.display = 'none';
      }
      drawRequest(employee.id, _request, 2);
    }
  }

  function drawRequest(employeeId, request, select = 0) {
    if (select)
      _calendar.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    if (isNaN(new Date(request.fromdate)) || isNaN(new Date(request.todate)))
      return;

    let td = _calendar.querySelector(`tr[data-id="${employeeId}"]`).children[dayOfYear(request.fromdate) + 1],
      _n = dayOfYear(request.todate) - dayOfYear(request.fromdate);
    do {
      if (td.classList.contains('type5')) {
        td.className = 'type5';
        if (select)
          td.classList.add('selected');
      } else if (request.status === 3) { // Delete
        td.className = select ? 'selected' : '';
        td.innerHTML = '&#8195;';
      } else {
        if (select !== 1)
          td.className = request.type + (request.status === 2 ? '' : ' unconfirmed');
        if (select)
          td.classList.add('selected');
        if (request.type === 'type1' || request.type === 'type2')
          td.innerHTML = Math.ceil((new Date(request.todate).getTime() - new Date(request.fromdate).getTime()) / 3600000);
        else
          td.innerHTML = '&#8195;';
      }
      td = td.nextSibling;
    } while (--_n >= 0);

    return td;
  }

  function saveCalendar() {
    // Remove deleted requests
    // Broadcast changes via sockets
    localStorage.setItem('employees', JSON.stringify(employees));
  }

  function broadcastRequest(employeeId, request) {
    // Sockets
  }

  function dayOfYear(date) {
    date = new Date(date);
    return Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000) - 1;
  }

  function addDays(date, days) {
    let d = new Date(new Date(date).getTime() + days * 86400000);
    return (new Date(date).getFullYear() !== d.getFullYear() ? new Date(date) : d).toISOString();
  }

  return {
    load: loadCalendar,
    sync: syncRequest,
    select: selectRequest,
    manage: manageRequest,
    save: saveCalendar
  }
})({});
