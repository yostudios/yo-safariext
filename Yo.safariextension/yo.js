var num_unread = safari.extension.settings.num_unread;
var username = null;
var loginFail = false;

// Register for the validate and command events.
safari.application.addEventListener('validate', performValidate, false);
safari.application.addEventListener('command', performCommand, false);

var JSONRequestHeaders = [['X-Requested-With', 'XMLHttpRequest'],
                          ['Accept', 'application/json'],
                          ['Cache-Control', 'no-cache']];

var JSONRequest = function(method, url, callback){
  var request = new XMLHttpRequest();
  request.open(arguments[0].method || method, arguments[0].url || url);

  JSONRequestHeaders.forEach(function(headerPair){
    request.setRequestHeader(headerPair[0], headerPair[1]);
  });

  request.onload = function(){
    var response = JSON.parse(request.responseText);
    var cb = arguments[0].callback || callback;
    if (typeof cb == 'function') cb.call(request, response);
  }

  return request;
}

function main(){
  getUnread();
  setInterval(getUnread, 10000);
}

function performValidate(event){
  switch (event.command) {
    case 'read_messages':
      if ('badge' in event.target)
        event.target.badge = num_unread;
      if ('image' in event.target)
        event.target.image = safari.extension.baseURI + ((loginFail) ? 'error.png' : 'yo.png');
    break;
  }
}

function performCommand(event) {
  switch (event.command) {
    case 'read_messages':
      // TODO: check if yo already is the active tab and reload that instead
      var tab = safari.application.activeBrowserWindow.openTab();
      tab.url = (username) ? 'http://' + username + '.yo.se/friends/' : 'http://yo.se/#login';
      if (username) updateUnreadMessageCount(0);
    break;
  }
}

function validateToolbarItems() {
  var toolbarItems = safari.extension.toolbarItems;
  for (var i = 0; i < toolbarItems.length; ++i) {
    if (toolbarItems[i].identifier !== 'messages') continue;
    // Calling validate will dispatch a validate event, which will call
    // performValidate for each toolbar item. This is the recommended method
    // of updating items instead of directly setting a badge here, so multiple
    // event listeners have a chance to validate the item.
    toolbarItems[i].validate();
  }
}

function updateUnreadMessageCount(count) {
  num_unread = count;
  safari.extension.settings.num_unread = num_unread;
  validateToolbarItems();
}

function getUsername(){
  // this will get redirected to users page if logged in
  var request = new JSONRequest('GET', 'http://yo.se/accounts/profile/', function(response){
    if (response.redirect) {
      loginFail = false;
      // don't follow the redirect, just extract username :O
      username = response.redirect.split('.')[0].substr(7);
      getUnread();
    } else {
      loginFail = true;
      validateToolbarItems();
    }
  });
  request.send();
}

function getUnread(){
  if (!username) return getUsername();
  var request = new JSONRequest('GET', 'http://' + username + '.yo.se/friends/unread/', function(response){
    updateUnreadMessageCount(response.num_unread);    
  });
  request.send();
}

// TODO: maybe this should be called from some extension load event
main();
