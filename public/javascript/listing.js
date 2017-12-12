'use strict'
/* global $ */
$(function () {
  function updateLinks () {
    var input = $('input[name=size]')
    var size = parseInt(input.val(), 10)
    if (!size || size < 10 || size > 1000) {
      input.val('').addClass('invalid')
      return
    }
    input.removeClass('invalid')
    var containerSize = Math.max(100, size)
    $('div.preview').each(function () {
      var preview = $(this)
      preview.find('.preview-image').css('width', size).css('height', size)
      preview.css('min-width', containerSize + 38)
    })
    window.history.replaceState({}, $('title').text(), window.location.href.replace(/size-\d+/, 'size-' + size))
    return false
  }
  $('.btn-update-sizes').click(updateLinks)
  updateLinks()

  $('.trigger-page-jumper').click(function (){
    $('input[name=page]').val($('.pagination .page-item.active').first().text())
    var first = parseInt($('.pagination .page-item').first().text(), 10)
    var last = parseInt($('.pagination .page-item').last().text(), 10)
    $('input[name=page]').attr('min', first).attr('max', last)
    $('.jump-to-page').modal('show')
    setTimeout(function() {
      $('input[name=page]').focus()
    },50)
    return false
  })

  function validateJumper(){
    var jumper = $('input[name=page]')
    var first = parseInt($('.pagination .page-item').first().text(), 10)
    var current = parseInt($('.pagination .page-item.active').first().text(), 10)
    var last = parseInt($('.pagination .page-item').last().text(), 10)
    var page = parseInt(jumper.val(), 10)
    if (page < first || page > last){
      jumper.addClass('invalid')
      jumper.closest('.modal-body').addClass('invalid')
      return false
    }
    jumper.removeClass('invalid')
    jumper.closest('.modal-body').removeClass('invalid')
    return true
  }
  $('input[name=page]').blur(validateJumper).change(validateJumper)
  $('.jump-to-page form').on('submit', validateJumper)

  function copyTextToClipboard (text) {
    var textArea = document.createElement('textarea')
    textArea.style.position = 'fixed'
    textArea.style.top = 0
    textArea.style.left = -500000
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    var success = true
    try {
      if (!document.execCommand('copy')) {
        success = false
      }
    } catch (err) {
      success = false
    }
    document.body.removeChild(textArea)
    return success
  }

  function links (button) {
    var size = parseInt($('input[name=size]').val(), 10) || 300
    var container = $(button).closest('.preview')
    var resizeable = container.data('resizeable')
    var staticLink = 'https://' + window.location.host + container.data('staticlink')
    var sizeableLink = 'https://' + window.location.host + container.data('sizeablelink')
    return {
      '%NAME%': container.data('name'),
      '%FULL%': encodeURI(staticLink),
      '%SIZED%': encodeURI(resizeable ? sizeableLink.replace(/%SIZE%/g, size) : staticLink)
    }
  }

  var texts = {
    'link': '%SIZED%',
    'original-link': '%FULL%',
    'markdown': '![%NAME%](%SIZED%)',
    'markdown-link': '[![%NAME%](%SIZED%)](%FULL%)',
    'bbcode': '[img]%SIZED[/img]',
    'bbcode-link': '[url="%FULL%][img]%SIZED%[/img][/url]',
    'html': '<img src="%SIZED%" />',
    'html-link': '<a href="%FULL%"><img src="%SIZED%" /></a>'
  }

  function getActionText (target) {
    var replacers = links(target)
    var text = texts[target.data('action-what')] || texts['link']
    Object.keys(replacers).forEach(function (replacer) {
      var regex = new RegExp(replacer, 'g')
      text = text.replace(regex, replacers[replacer])
    })
    return text
  }

  $('.action-copy').click(function () {
    var self = $(this)
    var text = getActionText(self)
    copyTextToClipboard(text)
    return false
  })
  $('.action-view').click(function () {
    var self = $(this)
    var text = getActionText(self)
    window.location = text
    return false
  })
})
