const app = app || getApp();
const zutils = require('../../utils/zutils.js');
const wss = require('../../utils/wss.js');

Page({
  data: {
    showConfirm: false
  },
  roomId: null,

  onLoad: function (e) {
    this.roomId = e.id || e.pkroom;
    if (!this.roomId || !app.GLOBAL_DATA.USER_INFO) {
      app.gotoPage('/pages/pk/start');
      return;
    }

    let that = this;
    app.getUserInfo(function (u) {
      that.setData({
        fooHeadimg: u.headimgUrl,
        fooNick: u.nick
      });

      if (e.id) {
        that.setData({
          stateText: '等待对手加入'
        });
        that.initSocket();
      } else if (e.pkroom) {
        that.setData({
          stateText: '等待发起者开始'
        });
        that.barEnter();
      }
    });
  },

  barEnter: function () {
    let that = this;
    zutils.post(app, 'api/pk/pk-enter?room=' + this.roomId, function (res) {
      let _data = res.data;
      if (_data.error_code != 0) {
        wx.showModal({
          title: '提示',
          content: _data.error_msg,
          showCancel: false,
          success: function () {
            wx.navigateBack();
          }
        });
      } else {
        _data = _data.data;
        that.setData({
          barHeadimg: _data.fooHeadimg,
          barNick: _data.fooNick
        });
        that.initSocket();
      }
    });
  },

  initSocket: function () {
    let url = 'ws/api/pk/room-echo?uid=' + app.GLOBAL_DATA.USER_INFO.uid + '&room=' + this.roomId;
    wss.init(url, this.handleMessage);
  },

  handleMessage: function (data) {
    let that = this;
    switch (data.action) {
      case 1010:  // BAR进入
        data.showConfirm = true;
        data.stateText = '请确认开始对战';
        that.setData(data);
        that.__barUid = data.barUid;
        break;
      case 1011:  // FOO开始
        wss.close('PKNEXT');
        wx.redirectTo({
          url: 'room-pk?id=' + that.roomId
        });
        break;
      case 1012:  // BAR放弃
        that.setData({
          showConfirm: false,
          barHeadimg: null,
          barNick: null,
          stateText: '等待对手加入'
        });
        break;
      case 1013:  // FOO 放弃
        wx.showModal({
          title: '提示',
          content: '发起者已放弃',
          showCancel: false,
          success: function () {
            wx.navigateBack();
          }
        })
        break;
      default:
        console.log('未知 Action ' + data.action);
    }
  },

  cancelPk: function () {
    wx.showModal({
      title: '提示',
      content: '确认放弃本轮对战吗？',
      success: function (res) {
        if (res.confirm) {
          wss.close('PKWAIT');
          wx.navigateBack();
        }
      }
    })
  },

  onUnload: function () {
    wss.close('PKWAIT');
  },

  confirmPk: function (e) {
    let that = this;
    let _url = 'api/pk/pk-start?room=' + this.roomId + '&bar=' + this.__barUid + '&formId=' + + (e.detail.formId || '');
    zutils.post(app, _url, function (res) {
      let _data = res.data;
      if (_data.error_code != 0) {
        wx.showModal({
          title: '提示',
          content: _data.error_msg,
          showCancel: false,
          success: function () {
            wx.navigateBack();
          }
        })
      } else {
        wss.close('PKNEXT');
        wx.redirectTo({
          url: 'room-pk?id=' + that.roomId
        });
      }
    });
  },

  onShareAppMessage: function () {
    let that = this;
    let d = {
      title: app.GLOBAL_DATA.USER_INFO.nick + '向你发起挑战',
      path: '/pages/pk/start?pkroom=' + that.roomId,
      success: function (res) {
        wx.navigateTo({
          url: 'room-wait?id=' + that.roomId
        });
      }
    }
    return d;
  }
})