(function() {
	'use strict';

	var controls = document.getElementById('vlmcsd-service-buttons');
	var status = document.querySelector('.cbi-map-descr');
	var result = document.getElementById('vlmcsd-service-result');

	if (!controls || !result)
		return;

	var buttons = controls.getElementsByTagName('button');
	var index;
	var actionPending = false;
	var refreshEnabled = true;
	var refreshTimer;

	function updateButtons(running) {
		controls.setAttribute('data-running', running ? '1' : '0');
		status = document.querySelector('.cbi-map-descr');
		if (status)
			status.textContent = running ?
				controls.getAttribute('data-running-label') :
				controls.getAttribute('data-stopped-label');
		if (!actionPending) {
			buttons[0].disabled = running;
			buttons[1].disabled = !running;
			buttons[2].disabled = false;
		}
	}

	function pollServiceStatus() {
		if (!refreshEnabled || actionPending)
			return;

		var request = new XMLHttpRequest();
		request.open('GET', controls.getAttribute('data-status-url') + '?_=' + Date.now(), true);
		request.onload = function() {
			if (request.status !== 200 || actionPending || !refreshEnabled)
				return;

			try {
				var response = JSON.parse(request.responseText);
				if (typeof response.running === 'boolean')
					updateButtons(response.running);
			} catch (error) {
				/* Keep the last known state if the status response is invalid. */
			}
		};
		request.send();
	}

	function setRefreshEnabled(enabled) {
		refreshEnabled = enabled;
		refreshToggle.textContent = enabled ? 'ОБНОВЛЯЕТСЯ' : 'НА ПАУЗЕ';
		refreshToggle.style.color = enabled ? '#208000' : '#777';
		refreshToggle.className = enabled ?
			'btn cbi-button cbi-button-positive' : 'btn cbi-button';
		if (enabled) {
			refreshToggle.style.removeProperty('border-color');
			refreshToggle.style.removeProperty('outline-color');
		} else {
			refreshToggle.style.setProperty('border-color', '#777', 'important');
			refreshToggle.style.setProperty('outline-color', '#777', 'important');
		}
		refreshToggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
		if (refreshTimer)
			window.clearInterval(refreshTimer);
		if (enabled) {
			pollServiceStatus();
			refreshTimer = window.setInterval(pollServiceStatus, 5000);
		}
	}

	function sendAction(button) {
		var request = new XMLHttpRequest();

		actionPending = true;
		for (var i = 0; i < buttons.length; i++)
			buttons[i].disabled = true;

		request.open('POST', controls.getAttribute('data-url'), true);
		request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		request.onload = function() {
			try {
				var response = JSON.parse(request.responseText);
				if (request.status !== 200 || response.ok !== true)
					throw new Error('service action failed');

				result.textContent = '';
			} catch (error) {
				updateButtons(controls.getAttribute('data-running') === '1');
				buttons[2].disabled = false;
				result.textContent = controls.getAttribute('data-error');
			} finally {
				actionPending = false;
				updateButtons(controls.getAttribute('data-running') === '1');
			}
		};
		request.onerror = function() {
			actionPending = false;
			updateButtons(controls.getAttribute('data-running') === '1');
			buttons[2].disabled = false;
			result.textContent = controls.getAttribute('data-error');
		};
		request.send('token=' + encodeURIComponent(controls.getAttribute('data-token')) +
			'&action=' + encodeURIComponent(button.getAttribute('data-action')));
	}

	for (index = 0; index < buttons.length; index++) {
		buttons[index].addEventListener('click', function() {
			sendAction(this);
		});
	}

	var map = controls.closest('.cbi-map');
	if (map) {
		var refreshToggle = document.createElement('button');
		refreshToggle.type = 'button';
		refreshToggle.style.cssText = 'float:right; margin:0 0 0.5em 0.5em;';
		refreshToggle.addEventListener('click', function() {
			setRefreshEnabled(!refreshEnabled);
		});
		map.insertBefore(refreshToggle, map.firstChild);
		setRefreshEnabled(true);
	}
})();
