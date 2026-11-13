module("luci.controller.vlmcsd", package.seeall)

function index()
	if not nixio.fs.access("/etc/config/vlmcsd") then
		return
	end
	local page
	page = entry({"admin", "services", "vlmcsd"}, cbi("vlmcsd"), _("vlmcsd"), 100)
	page.i18n = "vlmcsd"
	page.dependent = true

	local control = entry({"admin", "services", "vlmcsd", "control"}, call("service_control"))
	control.leaf = true
	control.post = true

	local status = entry({"admin", "services", "vlmcsd", "status"}, call("service_status"))
	status.leaf = true
end

local function service_running()
	local sys = require "luci.sys"
	return sys.call("pidof vlmcsd >/dev/null 2>&1") == 0
end

function service_status()
	local http = require "luci.http"
	http.prepare_content("application/json")
	http.write_json({ running = service_running() })
end

function service_control()
	local http = require "luci.http"
	local util = require "luci.util"
	local action = http.formvalue("action")
	local allowed_actions = {
		start = true,
		stop = true,
		restart = true
	}

	if not allowed_actions[action] then
		http.status(400, "Bad Request")
		http.prepare_content("application/json")
		http.write_json({ ok = false })
		return
	end

	local result, ubus_error = util.ubus("rc", "init", {
		name = "vlmcsd",
		action = action
	})

	local expected_running = action ~= "stop"
	local running
	for _ = 1, 10 do
		running = service_running()
		if running == expected_running then
			break
		end
		require "nixio".nanosleep(0, 200000000)
	end

	local action_succeeded = result ~= nil or ubus_error == nil or ubus_error == 0

	http.prepare_content("application/json")
	http.write_json({ ok = not not action_succeeded, running = not not running })
end
