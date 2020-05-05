const rootHost = "https://scheduledata.herokuapp.com"
const dataSource = rootHost + "/query/"
const sessionSource = rootHost + "/session/"
const arenaSource = rootHost + "/arena/"
const teacherSource = rootHost + "/teacher"

const teacherRatingSite = "https://studentsreview.me/teachers/"

const maxClasses = 7
const minClasses = 5

const firstSemesterID = 1
const secondSemesterID = 2
const allYearID = 0

var departments = []

var selectedDepartment = "0"
var selectedCourseCodes = []

var selectedCourse = "0"
var selectedTeachers = []

var selectedOffBlockSemester = "0"
var selectedOffBlockNumber = "0"
var selectedOffBlocks = [[], []]

var checkboxesDisabled = false
var checkboxes = []

var courseObjects = {}
var courseNames = {}
var currentSeatCounts = {}

function getJSON(dataSource, arguments, callback)
{
  $("#loader").show()
  $.getJSON(dataSource, arguments, function(data)
  {
    $("#loader").hide()
    callback(data)
  })
}

$.ajaxSetup({
  //Disable caching of AJAX responses
  cache: false
})

$(function()
{
  //addMobileMessages()
  setupSessionButtons()

  var url = new URL(window.location.href);
  var shareUUID = url.searchParams.get("shareUUID");
  if (shareUUID != null)
  {
    loadSession(shareUUID, function() {reloadThenShowFavorites()}, true)
  }
  else
  {
    loadCourseSelection()
  }
})

function isMobile()
{
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function addMobileMessages()
{
  if (isMobile())
  {
    window.addEventListener("orientationchange", function() {
      editMobileMessages()
    })
    if (window.innerHeight > window.innerWidth)
    {
      $("#instructionsContainer").append("<span id='mmlandscape'><h3 style='color:white;'>* For a better experience, try viewing the website in landscape mode</h3></span>")
    }
  }
}

function editMobileMessages()
{
  if (window.innerHeight < window.innerWidth)
  {
    $("#mmlandscape").empty()
  }
  else
  {
    addMobileMessages()
  }
}

function setupSessionButtons()
{
  var widthOfBox = 150
  $("#sessionID").css('width', widthOfBox)
  $("#saveButton").css('width', widthOfBox / 3)
  $("#loadButton").css('width', widthOfBox / 3)
  $("#favoriteButton").css('width', widthOfBox / 3)
  $("#shareButton").css('width', widthOfBox)
  $("#sessionShare").css('width', widthOfBox)
  $("#sessionShare").hide()
}

//MARK: - Course Selection

async function loadCourseSelection()
{
  showingFavorites = false

  itemToMoveFrom = "0"

  //Reset checkboxes
  checkboxes = []
  checkboxesDisabled = false

  //Setup HTML elements
  setupCourseSelectionElements()

  //Get side scroller objects
  getDepartmentObjects(function(departmentsTmp)
  {
    departments = departmentsTmp

    //Create a row for each object
    for (departmentObject in departments)
    {
      var departmentRow = $("<div class='departmentScroller' id='dep" + departments[departmentObject].departmentNum + "'><span style='z-index:2; position:relative;'><h3 class='scrollerText' style='color:WHITE;'>" + departments[departmentObject].departmentTitle + "</h3></span></div>")
      departmentRow.attr("onclick", "selectDepartment(this)")
      $(".departmentScrollerContainer").append(departmentRow)
    }

    //Select first object
    selectedDepartment = "1"
    selectDepartment($("#dep1"))
    selectedItem = "1"
    itemToMoveFrom = "1"
    moveSelectionBox("#dep", 1, true)
  })

  //Add selected courses if any exist
  for (courseCodeNum in selectedCourseCodes)
  {
    addToMyCourses(selectedCourseCodes[courseCodeNum])
  }

  var firstSemesterCourseCount = await getCourseCount(firstSemesterID)
  var secondSemesterCourseCount = await getCourseCount(secondSemesterID)

  if (firstSemesterCourseCount >= minClasses && secondSemesterCourseCount >= minClasses)
  {
    $(".myCourses").append("<input id='nextButton' type='button' value='Next' onclick='loadTeacherSelection()'>")
  }
}

function setupCourseSelectionElements()
{
  //Add scroller, checkbox container, and selected object container
  var selection = $("#selection")

  selection.empty()

  selection.append("<div class='departmentScrollerContainer'><div class='selectedAnimationBox' id='selectionbox'></div></div>")
  selection.append("<div class=classSelectionContainer><div class='classSelection'></div></div>")
  selection.append("<div class=myCoursesContainer><div class='myCourses'><h3><div id='myCoursesTitle'>My Courses</div></h3></div></div>")

  $("#instructions").html("Choose your classes and then click \"Next\"")
}

function getDepartmentObjects(completion)
{
  //Get departments from source
  getJSON(dataSource,
  {
    "table": "departments"
  }, function(data)
  {
    var departmentsTmp = []
    for (departmentIndex in data)
    {
      //Create department objects
      var departmentArray = data[departmentIndex]
      var department = new SchoolDepartment(departmentArray)
      departmentsTmp.push(department)
    }

    console.log(departmentsTmp)

    completion(departmentsTmp)
  })
}

function selectDepartment(departmentElement)
{
  var itemToMoveFromTmp = selectedDepartment
  selectedDepartment = $(departmentElement).attr("id").replace("dep", "")

  if (itemToMoveFromTmp != selectedDepartment)
  {
    itemToMoveFrom = itemToMoveFromTmp
    selectedItem = selectedDepartment
    var movementDirection = Math.sign(selectedItem - itemToMoveFrom)
    moveSelectionBox("#dep", movementDirection)
  }

  //Get course objects from department
  getCoursesFromDepartment(selectedDepartment, function(courses)
  {
    var classSelection = $(".classSelection")

    classSelection.empty()
    classSelection.append("<br>")
    //Add a checkbox for each course object
    for (course in courses)
    {
      var courseInput = $("<input>")

      courseInput.attr("id", courses[course].courseCode)
      courseInput.attr("type", "checkbox")
      courseInput.attr("onclick", "checkedCourse(this)")
      courseInput.prop("disabled", (checkboxesDisabled && !selectedCourseCodes.includes(courses[course].courseCode)))
      courseInput.prop("checked", (selectedCourseCodes.includes(courses[course].courseCode)))
      classSelection.append(courseInput)
      classSelection.append(" " + courses[course].courseName + "<br>")

      checkboxes.push(courseInput)
    }
    classSelection.append("<br>")
  })
}

const timeToMoveBox = 200
const moveBoxInterval = 5
var itemToMoveFrom = ""
var selectedItem = ""

function moveSelectionBox(currentIDPrefix, movementDirection, overrideCheck)
{
  if (itemToMoveFrom != selectedItem || overrideCheck)
  {
    $("#selectionbox").css("width", $(currentIDPrefix + selectedItem).css("width"))
    $("#selectionbox").css("height", $(currentIDPrefix + selectedItem).css("height"))
    var percentToMove = moveBoxInterval/timeToMoveBox
    var topPosition = $("#selectionbox").position().top

    var positionToMoveTo = $(currentIDPrefix + selectedItem).offset().top
    if ($(currentIDPrefix + itemToMoveFrom).offset() == null)
      return
    var positionToMoveFrom = $(currentIDPrefix + itemToMoveFrom).offset().top

    var moveAmount = (positionToMoveTo-positionToMoveFrom)*percentToMove

    //console.log(positionToMoveTo + " -- " + positionToMoveFrom)

    if ((movementDirection == 1 && $("#selectionbox").offset().top > positionToMoveTo) || movementDirection == -1 && $("#selectionbox").offset().top < positionToMoveTo)
    {
      $("#selectionbox").css("top", $(currentIDPrefix + selectedItem).position().top)
      return
    }

    $("#selectionbox").css("top", topPosition + moveAmount)

    setTimeout(function() {
      moveSelectionBox(currentIDPrefix, movementDirection)
    }, moveBoxInterval)
  }
}

function getCoursesFromDepartment(departmentNumber, completion)
{
  //Get courses from a departmentNumber
  getJSON(dataSource,
  {
    "table": "courses",
    "column": "courseName,courseCode",
    "key": "departmentNumber",
    "value": departmentNumber,
    "order": "courseName"
  }, function(data)
  {
    var courses = []
    for (courseIndex in data)
    {
      //Create SchoolCourse objects
      var courseArray = data[courseIndex]
      var course = new SchoolCourse(courseArray)
      courses.push(course)
    }

    completion(courses)
  })
}

async function checkedCourse(checkbox)
{
  //When a course checkbox is checked
  if (checkbox.checked)
  {
    //Add it to the selected course codes
    selectedCourseCodes.push($(checkbox).attr("id"))

    if (selectedTeachers.length > 0)
    {
      //Add an array to the for the course in the selectedTeachers array
      selectedTeachers.push([])
    }

    //Disable the checkboxes if the class max is reached
    var firstSemesterCourseCount = await getCourseCount(firstSemesterID)
    var secondSemesterCourseCount = await getCourseCount(secondSemesterID)
    if (firstSemesterCourseCount > maxClasses || secondSemesterCourseCount > maxClasses)
    {
      checkboxesDisabled = true

      for (checkboxNum in checkboxes)
      {
        //Only disable if not checked
        if (!checkboxes[checkboxNum][0].checked)
        {
          checkboxes[checkboxNum][0].disabled = true
        }
      }
    }

    //Add the course to the selected course container
    addToMyCourses($(checkbox).attr("id"))

    //Add a nextButton if there are enough selectedCourses and a next button does not exist yet
    if (firstSemesterCourseCount >= minClasses && secondSemesterCourseCount >= minClasses && $("#nextButton").length == 0)
    {
      $(".myCourses").append("<input id='nextButton' type='button' value='Next' onclick='loadTeacherSelection()'>")
    }
  }
  else
  {
    if (selectedTeachers.length > 0)
    {
      //Remove the array for the selectedCourse in selectedTeachers
      selectedTeachers.splice(selectedCourseCodes.indexOf($(checkbox).attr("id")), 1)
    }

    //Remove course from selectedCourseCodes
    selectedCourseCodes.splice(selectedCourseCodes.indexOf($(checkbox).attr("id")), 1)

    //Re-enable check boxes if the selectedCourseCodes count is maxClasses-1
    var firstSemesterCourseCount = await getCourseCount(firstSemesterID)
    var secondSemesterCourseCount = await getCourseCount(secondSemesterID)
    if (firstSemesterCourseCount <= maxClasses || secondSemesterCourseCount <= maxClasses)
    {
      checkboxesDisabled = false

      for (checkboxNum in checkboxes)
      {
        if (!checkboxes[checkboxNum][0].checked)
        {
          checkboxes[checkboxNum][0].disabled = false
        }
      }
    }

    //Remove the course from the selected course container
    removeFromMyCourses($(checkbox).attr("id"))

    //Remove the nextButton if there aren't enough classes
    if (firstSemesterCourseCount < minClasses && secondSemesterCourseCount < minClasses && $("#nextButton").length)
    {
      $(".myCourses").find("#nextButton").remove()
    }
  }
}

function addToMyCourses(courseCode)
{
  //Get the course name and the department number
  getJSON(dataSource,
  {
    "table": "courses",
    "column": "courseName,departmentNumber",
    "key": "courseCode",
    "value": courseCode
  }, function(courseData)
  {
    $(".myCourses").append("<div id=" + courseCode + ">" + departments[parseInt(courseData[0]["departmentNumber".toLowerCase()]) - 1].departmentTitle + " - " + courseData[0]["courseName".toLowerCase()] + "</div>")
  })
}

function removeFromMyCourses(courseCode)
{
  //Remove from the schedule
  $(".myCourses").find("#" + courseCode).remove()
}

//MARK: - Teacher Selection

var teachersRatingData = {}
var shouldAlwaysShowTeacherRating = true

function loadTeacherSelection()
{
  //Reset checkboxes
  checkboxes = []
  checkboxesDisabled = false

  selectedCourse = "0"

  var updateSelectedTeachers = (selectedTeachers.length == 0)

  //Setup HTML elements
  setupTeacherSelectionElements()

  //Get side scroller objects
  getCourses(selectedCourseCodes, function(courses)
  {
    var selectedCourseCodesTmp = []
    var selectedTeachersTmp = []

    courses.sort(function(a, b) {
      return selectedCourseCodes.indexOf(a.courseCode) > selectedCourseCodes.indexOf(b.courseCode)
    })

    for (courseNum in courses)
    {
      //Create a row for each object
      var courseRow = $("<div class='courseScroller' id='course" + courses[courseNum].courseCode + "'><span style='z-index:2; position:relative;'><h3 class='scrollerText' style='color:WHITE;'>" + courses[courseNum].courseName + "</h3></span></div>")
      courseRow.attr("onclick", "selectCourse(this)")
      $(".courseScrollerContainer").append(courseRow)

      selectedCourseCodesTmp.push(courses[courseNum].courseCode)
      if (updateSelectedTeachers)
      {
        selectedTeachers.push([])
      }
      else
      {
        selectedTeachersTmp.push(selectedTeachers[selectedCourseCodes.indexOf(courses[courseNum].courseCode)])
      }
    }

    selectedCourseCodes = selectedCourseCodesTmp
    console.log(selectedCourseCodes)

    if (!updateSelectedTeachers)
    {
      selectedTeachers = selectedTeachersTmp
    }

    //Select first object
    selectedCourse = selectedCourseCodes[0]
    selectCourse($("#course" + selectedCourseCodes[0]))
    selectedItem = selectedCourseCodes[0]
    itemToMoveFrom = selectedCourseCodes[0]
    moveSelectionBox("#course", 1, true)
  })

  //Add any previous selectedTeachers to myTeachers
  addAllTeachersToMyTeachers()

  //Test if there is at least one selected teacher for each course
  var canContinue = true
  for (var selectedTeacherArrayKey in selectedTeachers)
  {
    if (selectedTeachers[selectedTeacherArrayKey].length == 0)
    {
      canContinue = false
    }
  }
  if (selectedTeachers.length == 0)
  {
    canContinue = false
  }

  //Add the nextButton if there is
  if (canContinue)
  {
    $(".myTeachers").append("<input id='nextButton' type='button' value='Next' onclick='loadOffBlockSelection()'>")
  }
}

function setupTeacherSelectionElements()
{
  //Add scroller, checkbox container, and selected object container
  var selection = $("#selection")

  selection.empty()

  selection.append("<div class='courseScrollerContainer'><div class='selectedAnimationBox' id='selectionbox'></div></div>")
  selection.append("<div class='teacherSelectionContainer'><div class='teacherSelection'></div><button id='selectButton' onclick='selectAllTeachers()' style='position:absolute; top:20; right:20; vertical-align: top'>Select All</button></div>")
  selection.append("<div class='myTeachersContainer'><div class='myTeachers'><h3><div id='myTeachersTitle'>My Teachers</div></h3><br></div></div>")

  $("#instructions").html("Choose any teachers you want to have and then click \"Next\"")
}

function getCourses(courseCodeArray, completion)
{
  var courseObjectsLoaded = true
  for (courseCodeNum in courseCodeArray)
  {
    if (courseObjects[courseCodeArray[courseCodeNum]] == null)
    {
      courseObjectsLoaded = false
      break
    }
  }

  if (!courseObjectsLoaded)
  {
    //Get courses from courseCodes
    var whereSQL = ""
    for (courseCodeNum in courseCodeArray)
    {
      if (courseCodeNum != 0)
      {
        whereSQL += " or "
      }
      whereSQL += "courseCode=\'" + courseCodeArray[courseCodeNum] + "\'"
    }

    getJSON(dataSource,
    {
      "table": "courses",
      "where": whereSQL/*,
      "order": "departmentNumber,courseName asc"*/
    }, function(data)
    {
      var courses = []

      for (courseNum in data)
      {
        //Create course objects
        var courseArray = data[courseNum]
        var course = new SchoolCourse(courseArray)
        courses.push(course)
        courseObjects[course.courseCode] = course
      }

      completion(courses)
    })
  }
  else
  {
    var courseObjectsToReturn = []
    for (courseCodeNum in Object.keys(courseObjects))
    {
      var courseCode = Object.keys(courseObjects)[courseCodeNum]
      if (courseCodeArray.includes(courseCode))
      {
        courseObjectsToReturn.push(courseObjects[courseCode])
      }
    }
    completion(courseObjectsToReturn)
  }
}

function getCoursesPromise(courseCodes)
{
  var coursesPromise = new Promise((resolve, reject) => {
    getCourses(courseCodes, function(courseObjects) {
      resolve(courseObjects)
    })
  })

  return coursesPromise
}

function getTeachersForCourse(courseCode, completion)
{
  //Fetch teachers from courseCode
  getJSON(dataSource,
  {
    "table": "blocks",
    "column": "teacher",
    "key": "courseCode",
    "value": courseCode,
    "distinct": "618",
    "order": "teacher asc"
  }, function(data)
  {
    var teachers = []
    for (teacherObjectNum in data)
    {
      teachers.push(data[teacherObjectNum].teacher)
    }
    completion(teachers)
  })
}

function selectCourse(courseElement)
{
  checkboxes = []

  var itemToMoveFromTmp = selectedCourse
  selectedCourse = $(courseElement).attr("id").replace("course", "")

  if (itemToMoveFromTmp != selectedCourse)
  {
    selectedItem = selectedCourse
    itemToMoveFrom = itemToMoveFromTmp
    var movementDirection = Math.sign(selectedCourseCodes.indexOf(selectedItem) - selectedCourseCodes.indexOf(itemToMoveFrom))
    moveSelectionBox("#course", movementDirection)
  }

  getTeachersForCourse(selectedCourse, async function(teacherArray)
  {
    var teacherSelection = $(".teacherSelection")

    teacherSelection.empty()
    teacherSelection.append("<br>")
    for (teacher in teacherArray)
    {
      var teacherInput = $("<input>")
      teacherInput.attr("id", teacherArray[teacher])
      teacherInput.attr("type", "checkbox")
      teacherInput.attr("onclick", "checkedTeacher(this)")
      teacherInput.prop("disabled", (checkboxesDisabled && !selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)].includes(teacherArray[teacher])))
      teacherInput.prop("checked", (selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)].includes(teacherArray[teacher])))
      teacherSelection.append(teacherInput)

      var teacherNameHTML
      var teacherRatingData = await getTeacherRatings(teacherArray[teacher], selectedCourse)
      if (teacherRatingData)
      {
        teacherNameHTML = " <a onmouseover='showTeacherRating(this)' onmouseout='hideTeacherRating(this)' target='_blank' href='" + teacherRatingData["url"] + "'>" + teacherArray[teacher]
        teacherNameHTML += createTeacherRatingDiv(teacherRatingData["rating"])
        teacherNameHTML += "</a>"
      }
      else
        teacherNameHTML = teacherArray[teacher]

      teacherNameHTML += "<br>"
      teacherSelection.append(teacherNameHTML)

      checkboxes.push(teacherInput)
    }
    teacherSelection.append("<br>")
  })
}

function getTeacherRatings(teacherName, courseCode)
{
  var teacherRatingPromise = new Promise(async (resolve, reject) => {
    var courseObject = await getCoursesPromise([courseCode])
    courseObject = courseObject[0]
    var departmentNumber = courseObject.departmentNum

    var teacherID = teacherName + departmentNumber
    if (Object.keys(teachersRatingData).includes(teacherID))
    {
      resolve(teachersRatingData[teacherID])
      return
    }

    var teacherInitial
    if (teacherName.includes(","))
    {
      teacherInitial = teacherName.split(", ")[1].charAt(0)
      teacherName = teacherName.split(", ")[0]
    }

    var teacherDataGetHeaders = {
      "search": teacherName.toLowerCase(),
      "department": departmentNumber,
    }

    if (teacherInitial)
    {
      teacherDataGetHeaders["initial"] = teacherInitial.toLowerCase()
    }

    getJSON(teacherSource, teacherDataGetHeaders, function(data) {
      if (Object.keys(data).length == 0)
      {
        resolve(null)
        return
      }

      var teacherRatingData = {"name":data["name"], "rating":data["rating"], "url":teacherRatingSite + data["name"].toLowerCase().replaceAll(" ", "-")}
      teachersRatingData[teacherID] = teacherRatingData

      resolve(teacherRatingData)
    })
  })

  return teacherRatingPromise
}

function createTeacherRatingDiv(rating)
{
  var teacherRatingHTML = "<span class='ratingStars'>"
  rating = Math.round(rating*2)/2

  for (i=0; i < Math.floor(rating); i++)
  {
    teacherRatingHTML += "<img class='ratingStar' src='assets/favoriteIconPressed.png' />"
  }
  if (rating - Math.round(rating) != 0)
  {
    teacherRatingHTML += "<img class='ratingStar' src='assets/halfStarIcon.png' />"
  }
  for (i=0; i < 5-Math.ceil(rating); i++)
  {
    teacherRatingHTML += "<img class='ratingStar' src='assets/favoriteIcon.png' />"
  }
  teacherRatingHTML += "</span>"

  return teacherRatingHTML
}

function showTeacherRating(teacherDiv)
{
  if (!shouldAlwaysShowTeacherRating)
    unfade($(teacherDiv).find(".ratingStars")[0])
}

function hideTeacherRating(teacherDiv)
{
  if (!shouldAlwaysShowTeacherRating)
    fade($(teacherDiv).find(".ratingStars")[0])
}

function fade(element) {
    var op = 1;  // initial opacity
    var timer = setInterval(function () {
        if (op <= 0.1){
            clearInterval(timer);
            element.style.display = 'none';
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op -= op * 0.1;
    }, 5);
}

function unfade(element) {
    var op = 0.1;  // initial opacity
    element.style.display = 'inline';
    var timer = setInterval(function () {
        if (op >= 1){
            clearInterval(timer);
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op += op * 0.1;
    }, 5);
}

function checkedTeacher(checkbox)
{
  if (checkbox.checked)
  {
    selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)].push($(checkbox).attr("id"))

    addToMyTeachers($(checkbox).attr("id"))

    var canContinue = true
    for (var selectedTeacherArrayKey in selectedTeachers)
    {
      if (selectedTeachers[selectedTeacherArrayKey].length == 0)
      {
        canContinue = false
      }
    }

    if (canContinue)
    {
      $(".myTeachers").append("<input id='nextButton' type='button' value='Next' onclick='loadOffBlockSelection()'>")
    }
  }
  else
  {
    selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)].splice(selectedTeachers.indexOf($(checkbox).attr("id")), 1)

    removeFromMyTeachers($(checkbox).attr("id"))

    var canContinue = true
    for (var selectedTeacherArrayKey in selectedTeachers)
    {
      if (selectedTeachers[selectedTeacherArrayKey].length == 0)
      {
        canContinue = false
      }
    }

    if (!canContinue)
    {
      $(".myTeachers").find("#nextButton").remove()
    }
  }
}

async function addAllTeachersToMyTeachers()
{
  for (teacherArrayNum in selectedTeachers)
  {
    for (teacherNum in selectedTeachers[teacherArrayNum])
    {
      await addToMyTeachers(selectedTeachers[teacherArrayNum][teacherNum], selectedCourseCodes[teacherArrayNum])
    }
  }
}

function addToMyTeachers(teacher, localCourse)
{
  var myTeachersPromise = new Promise((resolve, reject) =>
  {
    getCourseName((localCourse ? localCourse : selectedCourse), function(courseName)
    {
      $(".myTeachers").find("br").remove()
      $(".myTeachers").append("<div id='" + (localCourse ? localCourse : selectedCourse) + SHA256(teacher) + "'>" + courseName + " - " + teacher + "</div>")
      $(".myTeachers").append("<br>")

      resolve()
    })
  })

  return myTeachersPromise
}

function removeFromMyTeachers(teacher)
{
  $(".myTeachers").find("#" + selectedCourse + SHA256(teacher)).remove()
}

function selectAllTeachers()
{
  for (teacherNum in selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)])
  {
    removeFromMyTeachers(selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)][teacherNum])
  }

  selectedTeachers[selectedCourseCodes.indexOf(selectedCourse)] = []
  for (checkbox in checkboxes)
  {
    checkboxes[checkbox].prop("checked", true)
    checkedTeacher(checkboxes[checkbox][0])
  }
}

//MARK: - Off Block Selection

async function loadOffBlockSelection()
{
  checkboxes = []
  checkboxesDisabled = false

  selectedOffBlockSemester = "0"
  selectedOffBlockNumber = "0"

  setupOffBlockSelectionElements()

  console.log(selectedTeachers)

  var updateSelectedOffBlocks = offBlockArraysEmpty()
  console.log(updateSelectedOffBlocks)

  var firstSemesterCourseCount = await getCourseCount(firstSemesterID)
  var secondSemesterCourseCount = await getCourseCount(secondSemesterID)

  addOffBlockDivs(firstSemesterCourseCount, firstSemesterID, updateSelectedOffBlocks)
  addOffBlockDivs(secondSemesterCourseCount, secondSemesterID, updateSelectedOffBlocks)

  addOffBlockArrays(updateSelectedOffBlocks, firstSemesterID-1, firstSemesterCourseCount)
  addOffBlockArrays(updateSelectedOffBlocks, secondSemesterID-1, secondSemesterCourseCount)

  if (offBlockArraysEmpty())
  {
    generateSchedules()
    return
  }

  reloadMyOffBlocks()

  selectedOffBlockSemester = "1"
  selectedOffBlockNumber = "1"
  selectOffBlock("#offBlock1")
  selectedItem = "1"
  itemToMoveFrom = "1"
  moveSelectionBox("#offBlock", 1, true)

  $("#instructions").html("Choose any off blocks you would like to have and then click \"Next\"")
}

function addOffBlockArrays(updateSelectedOffBlocks, semesterNumber, courseCount)
{
  while (!updateSelectedOffBlocks && selectedOffBlocks[semesterNumber].length != maxClasses + 1 - courseCount)
  {
    selectedOffBlocks[semesterNumber].push([])
  }
}

function offBlockArraysEmpty()
{
  for (offBlockSemesterNum in selectedOffBlocks)
    if (selectedOffBlocks[offBlockSemesterNum].length > 0)
      return false
  return true
}

function addOffBlockDivs(courseCount, semesterID, updateSelectedOffBlocks)
{
  for (var i = 0; i < maxClasses + 1 - courseCount; i++)
  {
    var offBlockRow = $("<div class='offBlockScroller' id='offBlock" + (calculateAbsoluteOffBlockNumber(semesterID, i)).toString() + "'><span style='z-index:2; position:relative;'><h3 class='scrollerText' style='color:WHITE;'>" + "Off Block S" + semesterID + " #" + (i + 1).toString() + "</h3></span></div>")
    offBlockRow.attr("onclick", "selectOffBlock(this)")
    $(".offBlockScrollerContainer").append(offBlockRow)

    if (updateSelectedOffBlocks)
    {
      selectedOffBlocks[semesterID-1].push([])
    }
  }
}

function setupOffBlockSelectionElements()
{
  var selection = $("#selection")

  selection.empty()

  selection.append("<div class='offBlockScrollerContainer'><div class='selectedAnimationBox' id='selectionbox'></div></div>")
  selection.append("<div class='offBlockSelectionContainer' style='position:relative'><div class='offBlockSelection'><br></div><button id='selectButton' onclick='selectAllOffBlocks()' style='position:absolute; top:20; right:20; vertical-align: top'>Select All</button></div>")
  selection.append("<div class='myOffBlocksContainer'><div class='myOffBlocks'><h3><div id='myOffBlocksTitle'>My Off Blocks</div></h3><br></div></div>")
}

function selectOffBlock(offBlockElement)
{
  var itemToMoveFromTmp = selectedItem
  var selectedOffBlockID = $(offBlockElement).attr("id").replace("offBlock", "")
  var selectedOffBlockIndex = calculateRelativeOffBlockIndex(selectedOffBlockID)
  selectedOffBlockSemester = selectedOffBlockIndex[0]
  selectedOffBlockNumber = selectedOffBlockIndex[1]

  if (itemToMoveFromTmp != selectedOffBlockID)
  {
    selectedItem = selectedOffBlockID
    itemToMoveFrom = itemToMoveFromTmp
    var movementDirection = Math.sign(selectedOffBlockID - itemToMoveFrom)
    moveSelectionBox("#offBlock", movementDirection)
  }

  var offBlockSelection = $(".offBlockSelection")

  offBlockSelection.empty()
  offBlockSelection.append("<br>")
  for (var i = 0; i < maxClasses + 1; i++)
  {
    var offBlockInput = $("<input>")
    offBlockInput.attr("id", (i + 1).toString())
    offBlockInput.attr("type", "checkbox")
    offBlockInput.attr("onclick", "checkedOffBlock(this)")
    offBlockInput.prop("disabled", (checkboxesDisabled && !selectedOffBlocks[parseInt(selectedOffBlockSemester)][parseInt(selectedOffBlockNumber) - 1].includes(i + 1)))
    offBlockInput.prop("checked", (selectedOffBlocks[parseInt(selectedOffBlockSemester)][parseInt(selectedOffBlockNumber) - 1].includes(i + 1)))
    offBlockSelection.append(offBlockInput)
    offBlockSelection.append(" " + "Block " + (i + 1).toString() + "<br>")

    checkboxes.push(offBlockInput)
  }
  offBlockSelection.append("<br>")
}

function calculateAbsoluteOffBlockNumber(semester, semesterOffBlockNumber)
{
  var absoluteOffBlockNumber = 1
  for (var i=0; i < parseInt(semester)-1; i++)
  {
    absoluteOffBlockNumber += selectedOffBlocks[i].length
  }
  absoluteOffBlockNumber += parseInt(semesterOffBlockNumber)

  return absoluteOffBlockNumber
}

function calculateRelativeOffBlockIndex(absoluteOffBlockNumber)
{
  var relativeOffBlockNumber = absoluteOffBlockNumber
  var semesterOn = 0
  while (relativeOffBlockNumber > selectedOffBlocks[semesterOn].length)
  {
    relativeOffBlockNumber -= selectedOffBlocks[semesterOn].length
    semesterOn += 1
  }

  return [semesterOn, relativeOffBlockNumber]
}

function checkedOffBlock(checkbox)
{
  if (checkbox.checked)
  {
    selectedOffBlocks[parseInt(selectedOffBlockSemester)][parseInt(selectedOffBlockNumber) - 1].push(parseInt($(checkbox).attr("id")))
  }
  else
  {
    selectedOffBlocks[parseInt(selectedOffBlockSemester)][parseInt(selectedOffBlockNumber) - 1].splice(selectedOffBlocks[parseInt(selectedOffBlockSemester)][parseInt(selectedOffBlockNumber) - 1].indexOf(parseInt($(checkbox).attr("id"))), 1)
  }

  reloadMyOffBlocks()
}

function reloadMyOffBlocks()
{
  $(".myOffBlocks").empty()
  $(".myOffBlocks").append("<h3><div id='myOffBlocksTitle'>My Off Blocks</div></h3>")

  for (semesterOn in selectedOffBlocks)
  {
    for (offBlockArrayNum in selectedOffBlocks[semesterOn])
    {
      for (offBlockNum in selectedOffBlocks[semesterOn][offBlockArrayNum].sort())
      {
        $(".myOffBlocks").append("<div id='" + (parseInt(semesterOn)+1).toString() + (parseInt(offBlockArrayNum) + 1).toString() + selectedOffBlocks[semesterOn][offBlockArrayNum][offBlockNum].toString() + "'>" + "<div style='display:inline;" + (offBlockNum == 0 ? "" : "visibility:hidden;") + "'>" + ("S" + (parseInt(semesterOn)+1) + " #" + (parseInt(offBlockArrayNum) + 1).toString()) + "</div>" + " - Block " + selectedOffBlocks[semesterOn][offBlockArrayNum][offBlockNum].toString() + "</div>")
      }
    }
  }

  var canContinue = true
  for (semesterOn in selectedOffBlocks)
  {
    for (offBlockNum in selectedOffBlocks[semesterOn])
    {
      for (offBlockNum2 in selectedOffBlocks[semesterOn])
      {
        if ((offBlockNum != offBlockNum2 && selectedOffBlocks[semesterOn][offBlockNum].sort().join(',') === selectedOffBlocks[semesterOn][offBlockNum2].sort().join(',') && selectedOffBlocks[semesterOn][offBlockNum].length < selectedOffBlocks[semesterOn].length && selectedOffBlocks[semesterOn][offBlockNum2].length < selectedOffBlocks[semesterOn].length) || selectedOffBlocks[semesterOn][offBlockNum].length == 0 || selectedOffBlocks[semesterOn][offBlockNum2].length == 0)
        {
          canContinue = false
        }
      }
    }
  }

  if (canContinue)
  {
    $(".myOffBlocks").append("<input id='nextButton' type='button' value='Next' onclick='generateSchedules()'>")
  }

  $(".myOffBlocks").append("<br>")
}

function selectAllOffBlocks()
{
  selectedOffBlocks[parseInt(selectedOffBlockSemester)][parseInt(selectedOffBlockNumber) - 1] = []
  for (var i = 0; i < maxClasses + 1; i++)
  {
    var checkbox = $("#" + (parseInt(i) + 1).toString())
    checkbox.prop("checked", true)
    checkedOffBlock(checkbox[0])
  }
}

function getCourseCount(semester)
{
  var courseCountPromise = new Promise((resolve, reject) => {
    if (selectedCourseCodes.length == 0)
    {
      resolve(0)
      return
    }
    var selectedCourses = getCourses(selectedCourseCodes, function(courses) {
      var courseCount = 0
      for (courseNum in courses)
        if (courses[courseNum].semester == semester || courses[courseNum].semester == allYearID)
          courseCount += 1
      resolve(courseCount)
    })
  })

  return courseCountPromise
}

//MARK: - Generate Schedules

const offBlockID = "OFFBLOCK"
const scheduleDisplayCount = 10

var blockArrays = [[], []]
var filters = []
var favoriteSchedules = {}
var expandedSchedules = {}

var schedules = []
var currentSchedule = []
var numberOfSchedulesDisplaying = 0

var schedulesTmp = []

var semesterNumberShowing = 0

var showingFavorites = false

async function generateSchedules(completion)
{
  blockArrays = [[], []]
  var filtersToKeep = []
  for (filterNum in filters)
  {
    if ((filters[filterNum]["courseCode"] == offBlockID || selectedCourseCodes.includes(filters[filterNum]["courseCode"])) && (filters[filterNum]["teacher"] == "any" || selectedTeachers[selectedCourseCodes.indexOf(filters[filterNum]["courseCode"])].includes(filters[filterNum]["teacher"])))
    {
      filtersToKeep.push(filters[filterNum])
    }
  }
  filters = filtersToKeep

  //$("#selection > *:not('.filterSelectionContainer')").remove()
  $("#selection").empty()
  $("#instructions").html("Generating...")

  //First semester generation
  await generateBlockArraysForSemester(0)
  await generateBlockArraysForSemester(1)

  loadSchedules(0, completion)
}

async function generateBlockArraysForSemester(semesterNumber)
{
  for (var i = 0; i < maxClasses + 1; i++)
  {
    blockArrays[semesterNumber].push({})
  }

  var courseObjects = await getCoursesPromise(selectedCourseCodes)
  for (courseNum in courseObjects)
  {
    if (parseInt(courseObjects[courseNum].semester) == semesterNumber+1 || courseObjects[courseNum].semester == allYearID)
    {
      await sortBlockArray(courseObjects[courseNum].courseCode, semesterNumber)
    }
  }

  for (offBlockArrayNum in selectedOffBlocks[semesterNumber])
  {
    for (offBlockNum in selectedOffBlocks[semesterNumber][offBlockArrayNum])
    {
      blockArrays[semesterNumber][selectedOffBlocks[semesterNumber][offBlockArrayNum][offBlockNum] - 1][offBlockID + (parseInt(offBlockArrayNum)).toString()] = {}
    }
  }
}

async function loadSchedules(semesterNumber, completion)
{
  schedules = []
  schedulesTmp = []
  currentSchedule = []
  numberOfSchedulesDisplaying = 0

  await createSchedules(semesterNumber)

  displaySchedules(null, completion)
}

function sortBlockArray(selectedCourseCode, semesterNumber)
{
  var sortBlockArrayPromise = new Promise(function(resolveBlockArray, rejectBlockArray)
  {
    getBlockDataFromCourseCodeAndSelectedTeachers(selectedCourseCode, "blockNumber,count(blockNumber),string_agg(teacher, '--')", async function(data)
    {
      for (countNum in data)
      {
        if (parseInt(data[countNum]["count"]) > 0)
        {
          var blockNumber = data[countNum]["blockNumber".toLowerCase()].toString()
          if (blockNumber.length >= 2)
            blockNumber = blockNumber.charAt(blockNumber.length-1)

          var teacherData = data[countNum]["string_agg"].split("--")
          for (teacherNum in teacherData)
          {
            await checkForFullClass(selectedCourseCode, teacherData[teacherNum], blockNumber).then(function(full){
              if (full)
              {
                console.log(full + " -- " + selectedCourseCode + " -- " + teacherData[teacherNum] + " -- " + blockNumber)
                teacherData.splice(teacherNum, 1)
              }
            })
          }

          if (teacherData.length > 0)
          {
            blockArrays[semesterNumber][parseInt(blockNumber) - 1][selectedCourseCode] = teacherData
          }
          else
          {
            delete blockArrays[semesterNumber][parseInt(blockNumber) - 1][selectedCourseCode]
          }
        }
      }

      resolveBlockArray()
    })
  })

  return sortBlockArrayPromise
}

function getBlockDataFromCourseCodeAndSelectedTeachers(courseCode, column, completion)
{
  var whereSQL = "courseCode=\'" + courseCode + "\' and ("
  for (teacher in selectedTeachers[selectedCourseCodes.indexOf(courseCode)])
  {
    if (teacher != 0)
    {
      whereSQL += " or "
    }
    whereSQL += "teacher=\'" + selectedTeachers[selectedCourseCodes.indexOf(courseCode)][teacher].replace(new RegExp("\"", 'g'), "\\\"") + "\'"
  }
  whereSQL += ")"

  getJSON(dataSource,
  {
    "table": "blocks",
    "distinct": "618",
    "column": column,
    "where": whereSQL,
    "group": "blockNumber",
    "order": "blockNumber asc"
  }, function(data)
  {
    completion(data)
  })
}

async function createSchedules(semesterNumber)
{
  await scheduleLoopSearch(0, semesterNumber, false)
  previousGeneratingProgress = null

  schedules = removeUniqueOffBlocks(schedules)
  schedules = multiDimensionalUnique(schedules)
  schedules = await removeSchedulesWithoutPossibleSecondSemesters(schedules)

  console.log(schedules)
}

async function scheduleLoopSearch(indexOn, semesterNumber, shouldIgnoreFilters)
{
  if (semesterNumber == firstSemesterID-1 && (previousGeneratingProgress == null || schedules.length-previousGeneratingProgress > 40))
    await updateGeneratingMessage(schedules.length, "Creating schedules")
  if (blockArrays[semesterNumber].length > indexOn)
  {
    for (var object in Object.keys(blockArrays[semesterNumber][indexOn]))
    {
      let courseBlock = Object.keys(blockArrays[semesterNumber][indexOn])[object]
      /*if (courseBlock.includes(offBlockID) && !currentSchedule.includes(courseBlock))
      {
        courseBlock = courseBlock.replace(courseBlock.replace(offBlockID, ""), "")
      }*/

      if (currentSchedule.includes(courseBlock) /*&& (courseBlock != offBlockID || countInArray(currentSchedule, courseBlock) >= maxClasses + 1 - selectedCourseCodes.length)*/)
      {
        continue
      }

      currentSchedule.push(courseBlock)
      await scheduleLoopSearch(indexOn + 1, semesterNumber, shouldIgnoreFilters)
    }
  }
  else
  {
    let shouldAddSchedule = true
    for (filterNum in filters)
    {
      if (filters[filterNum]["courseCode"] != undefined && filters[filterNum]["blockNumber"] != undefined && filters[filterNum]["teacher"] != undefined)
      {
        if (filters[filterNum]["blockNumber"] == "any")
        {
          if (filters[filterNum]["teacher"] != "any" && !blockArrays[semesterNumber][currentSchedule.indexOf(filters[filterNum]["courseCode"])][filters[filterNum]["courseCode"]].includes(filters[filterNum]["teacher"]))
          {
            shouldAddSchedule = false
            break
          }
        }
        else if (!((currentSchedule[parseInt(filters[filterNum]["blockNumber"])] == filters[filterNum]["courseCode"] || (currentSchedule[parseInt(filters[filterNum]["blockNumber"])].includes(offBlockID) && filters[filterNum]["courseCode"].includes(offBlockID))) && (filters[filterNum]["teacher"] == null || filters[filterNum]["teacher"] == "any" || blockArrays[semesterNumber][parseInt(filters[filterNum]["blockNumber"])][filters[filterNum]["courseCode"]].includes(filters[filterNum]["teacher"]))))
        {
          shouldAddSchedule = false
          break
        }
      }
    }

    if (shouldIgnoreFilters || shouldAddSchedule)
    {
      schedules.push(currentSchedule)
    }
    currentSchedule = currentSchedule.concat()
  }

  currentSchedule.pop()
}

function multiDimensionalUnique(arr)
{
  var uniques = []
  var itemsFound = {}
  for (var i = 0, l = arr.length; i < l; i++)
  {
    var stringified = JSON.stringify(arr[i])
    if (itemsFound[stringified])
    {
      continue
    }
    uniques.push(arr[i])
    itemsFound[stringified] = true
  }
  return uniques
}

function removeUniqueOffBlocks(schedules)
{
  for (var i = 0; i < schedules.length; i++)
  {
    for (var j = 0; j < schedules[i].length; j++)
    {
      if (schedules[i][j].includes(offBlockID))
      {
        schedules[i][j] = offBlockID;
      }
    }
  }
  return schedules;
}

function countInArray(array, what)
{
  return array.filter(item => item == what).length
}

async function removeSchedulesWithoutPossibleSecondSemesters(schedulesFound)
{
  var firstSemesterSchedules = schedulesFound.concat()
  var courseObjects = await getCoursesPromise(selectedCourseCodes)

  schedules = []
  currentSchedule = []

  await scheduleLoopSearch(0, secondSemesterID-1, true)

  for (i=firstSemesterSchedules.length-1; i >= 0; i--)
  {
    let percentDone = Math.round(1000*(firstSemesterSchedules.length-i)/firstSemesterSchedules.length)/10
    if (previousGeneratingProgress == null || previousGeneratingProgress.replace("%", "") != percentDone)
      await updateGeneratingMessage(percentDone + "%", "Checking second semesters")

    if (findSecondSemesterSchedules(firstSemesterSchedules[i], courseObjects).length == 0)
      firstSemesterSchedules.splice(i, 1)
  }

  return firstSemesterSchedules
}

var previousGeneratingProgress
async function updateGeneratingMessage(progress, action)
{
  var updateGeneratingMessagePromise = new Promise((resolve, reject) => {
    if (progress)
      $("#instructions").html("Generating... (" + action + ") (" + (progress) + ")"); previousGeneratingProgress = progress
    setTimeout(function() { resolve() }, 0)
  })

  return updateGeneratingMessagePromise
}

function findSecondSemesterSchedules(firstSemesterSchedule, courseObjects)
{
  var allYearCoursesBlockNum = []
  for (j=0; j < firstSemesterSchedule.length; j++)
  {
    allYearCoursesBlockNum.push(null)
  }

  for (courseCodeNum in firstSemesterSchedule)
  {
    if (firstSemesterSchedule[courseCodeNum].includes(offBlockID))
      continue

    var semesterOfCourse = allYearID
    for (courseNum in courseObjects)
    {
      if (courseObjects[courseNum].courseCode == firstSemesterSchedule[courseCodeNum])
      {
        semesterOfCourse = courseObjects[courseNum].semester
        break
      }
    }

    if (semesterOfCourse == allYearID)
      allYearCoursesBlockNum[courseCodeNum] = firstSemesterSchedule[courseCodeNum]
  }

  var scheduleMatches = []
  for (scheduleNum in schedules)
  {
    var scheduleDidNotMatch = false
    for (courseCodeNum in schedules[scheduleNum])
    {
      if (allYearCoursesBlockNum[courseCodeNum] != null && allYearCoursesBlockNum[courseCodeNum] != schedules[scheduleNum][courseCodeNum])
      {
        scheduleDidNotMatch = true
        break
      }
    }

    if (!scheduleDidNotMatch)
    {
      scheduleMatches.push(schedules[scheduleNum])
    }
  }

  return scheduleMatches
}

//MARK: - Display Schedules

const favoriteIDPrefix = "FAV"
const expandIDPrefix = "EXP"

const semesterColors = ["#ffffff", "#FFF856", "#5AFFF4"]

async function displaySchedules(showMorePressed, completion)
{
  if ($("#showMoreButton") != null)
  {
    $("#showMoreButton").remove()
  }

  if (showMorePressed == null || showMorePressed == undefined || !showMorePressed)
  {
    //$("#selection > *:not('.filterSelectionContainer')").remove()
    $("#selection").empty()
  }

  for (scheduleNum in schedules)
  {
    if (numberOfSchedulesDisplaying > scheduleNum)
    {
      continue
    }

    var scheduleHTML = await createScheduleDivHTML(schedules, scheduleNum, false, true)
    $("#selection").append("<div id='fullSchedule" + (parseInt(scheduleNum) + 1).toString() + "'>" + scheduleHTML + "</div><br><br>")

    numberOfSchedulesDisplaying += 1
    $("#instructions").html("Generating... (" + numberOfSchedulesDisplaying + "/" + schedules.length + ")")

    if (numberOfSchedulesDisplaying % scheduleDisplayCount == 0)
    {
      $("#selection").append("<button id='showMoreButton' onclick='displaySchedules(true)'>Show More</button>")
      break
    }
  }

  $("#instructions").html("Done! (Showing " + numberOfSchedulesDisplaying + "/" + schedules.length + ")")
  $("#instructions").append(" " + (!showingFavorites ? " <button onclick='loadCourseSelection()'>Edit</button>" : "") + " <button onclick='reloadPage()'>Clear</button>" + " <button onclick='toggleFavoriteFilter()'>" + (showingFavorites ? "Hide Favorites" : "Show Favorites") + "</button>")

  !showingFavorites ? setupFilterMenu() : false

  completion ? completion() : false
}

async function createScheduleDivHTML(schedules, scheduleNum, shouldIgnoreFilters, shouldAddButtons)
{
  var courseObjects = await getCoursesPromise(selectedCourseCodes)
  var courseDictionary = {}
  for (courseNum in courseObjects)
  {
    courseDictionary[courseObjects[courseNum].courseCode] = courseObjects[courseNum]
  }

  var scheduleHTML = "<div class='scheduleContainer'><div class='schedule' id='schedule" + (parseInt(scheduleNum) + 1).toString() + "'><h3>Schedule " + (parseInt(scheduleNum) + 1).toString() + "</h3><h4>"
  let thisScheduleInnerHTML = ""
  for (scheduleBlockNum in schedules[scheduleNum])
  {
    if (schedules[scheduleNum][scheduleBlockNum].includes(offBlockID))
    {
      thisScheduleInnerHTML += "Block " + (parseInt(scheduleBlockNum) + 1).toString() + ": Off Block<br>"
    }
    else
    {
      let courseObject = courseDictionary[schedules[scheduleNum][scheduleBlockNum]]
      let courseColor = semesterColors[courseObject.semester]

      thisScheduleInnerHTML += "<span style='color:" + courseColor + "'>Block " + (parseInt(scheduleBlockNum) + 1).toString() + ": "

      thisScheduleInnerHTML += courseObject.courseName + " - "

      // await getCourseName(schedules[scheduleNum][scheduleBlockNum], function(courseName)
      // {
      //   thisScheduleInnerHTML += courseName + " - "
      // })

      let filtersForBlock = []
      if (!shouldIgnoreFilters)
      {
        for (filterNum in filters)
        {
          if ((filters[filterNum]["blockNumber"] == scheduleBlockNum && filters[filterNum]["teacher"] != undefined) || (filters[filterNum]["blockNumber"] == "any" && filters[filterNum]["courseCode"] == schedules[scheduleNum][scheduleBlockNum]))
          {
            filtersForBlock = filters[filterNum]
            //break
          }
        }
      }

      if (filtersForBlock.length > 0 && filterForBlock["teacher"] != "any")
      {
        for (filterNum in filtersForBlock)
        {
          if (filterNum != 0)
          {
            thisScheduleInnerHTML += " or "
          }
          thisScheduleInnerHTML += filtersForBlock[filterNum]["teacher"]
        }
      }
      else
      {
        let teacherArray = blockArrays[semesterNumberShowing][scheduleBlockNum][schedules[scheduleNum][scheduleBlockNum]]
        for (teacherNum in teacherArray)
        {
          if (teacherNum != 0)
          {
            thisScheduleInnerHTML += " or "
          }
          var teacherData = await getTeacherRatings(teacherArray[teacherNum], schedules[scheduleNum][scheduleBlockNum])
          if (teacherData != null)
            thisScheduleInnerHTML += "<a target='_blank' href='" + teacherData["url"] + "'>" + teacherArray[teacherNum] + "</a>"
          else
            thisScheduleInnerHTML += teacherArray[teacherNum]
        }
      }

      thisScheduleInnerHTML += "</span><br>"
    }
  }

  scheduleHTML += thisScheduleInnerHTML + "</h4>"

  var imageFolder = "assets/"
  let scheduleID = SHA256(JSON.stringify(schedules[scheduleNum]))

  if (shouldAddButtons)
  {
    var favoriteImageURL = imageFolder + ((Object.keys(favoriteSchedules).includes(scheduleID)) ? "favoriteIconPressed.png" : "favoriteIcon.png")
    scheduleHTML += "<input id='" + favoriteIDPrefix + "-" + scheduleID + "' onclick='toggleFavoriteSchedule(this)' type='image' src='" + favoriteImageURL + "' class='favoriteButton' />"

    var expandImageURL = imageFolder + ((Object.keys(expandedSchedules).includes(scheduleID)) ? "expandIconEnabled.png" : "expandIcon.png")
    scheduleHTML += "<input id='" + expandIDPrefix + "-" + scheduleID + "' onclick='toggleSecondSemesterDisplay(this)' type='image' src='" + expandImageURL + "' class='secondSemesterExpandButton' />"
  }

  scheduleHTML += "</div>"
  scheduleHTML += "</div>"

  return scheduleHTML
}

var arenaData = []

function checkForFullClass(courseCode, teacherName, blockNumber)
{
  var checkForFullClassPromise = new Promise(function(resolve, reject) {
    resolve(false)
    return //disabling

    getCourseName(courseCode, function(courseName)
    {
      if (currentSeatCounts[courseName+teacherName+blockNumber] == undefined)
      {
        getArenaData().then(function(data) {
          var full = false

          /*var courseNameT = courseName.replace(/\s+/g, "\\s*").replace("Honors", "H").replace(/\./g, "")
          var teacherNameT = teacherName.replace(/\s+/g, "\\s*")
          var blockNumberT = blockNumber
          var scheduleCodeT = "N"
          var regexToTest = ["<tr>\\s*<td>\\s*" + courseNameT + "\\s*<\\/td><td>\\s*" + teacherNameT + "\\s*<\\/td><td>\\s*" + blockNumberT + "\\s*<\\/td><td>\\s*" + scheduleCodeT + "\\s*<\\/td><td>\\s*(\\d*|-\\d*)\\s*<\\/td>\\s*<\\/tr>", "<tr>\\s*<td>\\s*" + courseNameT + "\\*" + "\\s*<\\/td><td>\\s*" + teacherNameT + "\\s*<\\/td><td>\\s*" + blockNumberT + "\\s*<\\/td><td>\\s*" + scheduleCodeT + "\\s*<\\/td><td>\\s*(\\d*|-\\d*)\\s*<\\/td>\\s*<\\/tr>", "<tr>\\s*<td>\\s*CCSS\\s*" + courseNameT + "\\s*<\\/td><td>\\s*" + teacherNameT + "\\s*<\\/td><td>\\s*" + blockNumberT + "\\s*<\\/td><td>\\s*" + scheduleCodeT + "\\s*<\\/td><td>\\s*(\\d*|-\\d*)\\s*<\\/td>\\s*<\\/tr>", "<tr>\\s*<td>\\s*CCSS\\s*" + courseNameT + "\\*" +  "\\s*<\\/td><td>\\s*" + teacherNameT + "\\s*<\\/td><td>\\s*" + blockNumberT + "\\s*<\\/td><td>\\s*" + scheduleCodeT + "\\s*<\\/td><td>\\s*(\\d*|-\\d*)\\s*<\\/td>\\s*<\\/tr>"]

          for (regexNum in regexToTest)
          {
            var courseRegex = RegExp(regexToTest[regexNum], "gi")
            var matches = []
            var matchesTmp
            while (matchesTmp = courseRegex.exec(data)) {
              matches.push(matchesTmp[1])
            }

            if (matches.length > 0)
            {
              currentSeatCounts[courseName+teacherName+blockNumber] = parseInt(matches[(matches.length == 1) ? 0 : 1])
              full = (parseInt(matches[(matches.length == 1) ? 0 : 1]) <= 0)
              resolve(full)
              return
            }
          }

          console.log(data)
          console.log(regexToTest)*/

          var courseNameT = courseName.replace("Honors", "H").replace("*", "")
          var teacherNameT = teacherName
          var blockNumberT = blockNumber

          for (classNum in data)
          {
            if (data[classNum][0].replace("CCSS ", "").replace(/\s*\*/g, "").toUpperCase() == courseNameT.toUpperCase() && data[classNum][1] == teacherNameT && data[classNum][2] == blockNumberT)
            {
              currentSeatCounts[courseName+teacherName+blockNumber] = parseInt(data[classNum][4])
              full = parseInt(data[classNum][4]) <= 0
              resolve(full)
              return
            }
          }

          resolve(false)
        })
        //resolve(false)
      }
      else
      {
        resolve(currentSeatCounts[courseName+teacherName+blockNumber] <= 0)
      }
    })
  })

  return checkForFullClassPromise
}

var arenaData = null
var arenaLastUpdated = 0

function getArenaData()
{
  var arenaDataPromise = new Promise(function(resolve, reject) {
    if (arenaData == null || Date.now()-arenaLastUpdated > 180000)
    {
      $.get(arenaSource, {}, function(arenaDataTmp) {
        arenaData = arenaDataTmp
        arenaLastUpdated = Date.now()
        resolve(arenaData)
      })
    }
    else
    {
      resolve(arenaData)
    }
  })

  return arenaDataPromise
}

function getScheduleBlockTeachers(whereSQL, completion)
{
  var jsonPromise = new Promise((resolveJSON, rejectJSON) =>
  {
    getJSON(dataSource,
    {
      "table": "blocks",
      "distinct": "618",
      "column": "teacher",
      "where": whereSQL
    }, function(data)
    {
      completion(data)

      resolveJSON()
    })
  })

  return jsonPromise
}

function getCourseName(courseCode, completion)
{
  var getCourseNamePromise = new Promise((resolve, reject) =>
  {
    if (Object.keys(courseNames).length == 0 || courseNames[courseCode] == null)
    {
      whereSQL = ""
      for (selectedCourseCodeNum in selectedCourseCodes)
      {
        if (selectedCourseCodeNum != 0)
        {
          whereSQL += " or "
        }
        whereSQL += "courseCode=\'" + selectedCourseCodes[selectedCourseCodeNum] + "\'"
      }

      getJSON(dataSource,
      {
        "table": "courses",
        "column": "courseName,courseCode",
        "where": whereSQL
      }, function(courseData)
      {
        for (courseNum in courseData)
        {
          courseNames[courseData[courseNum]["courseCode".toLowerCase()]] = courseData[courseNum]["courseName".toLowerCase()]
        }

        completion(courseNames[courseCode])
        resolve()
      })
    }
    else
    {
      completion(courseNames[courseCode])
      resolve()
    }
  })

  return getCourseNamePromise
}

function reloadPage()
{
  $(document.body).append('<meta http-equiv="refresh" content="0;url=./index.html">')
}

function toggleFavoriteSchedule(inputElement)
{
  Object.keys(favoriteSchedules).includes($(inputElement).attr("id").replace(favoriteIDPrefix + "-", "")) ? delete favoriteSchedules[$(inputElement).attr("id").replace(favoriteIDPrefix + "-", "")] : favoriteSchedules[$(inputElement).attr("id").replace(favoriteIDPrefix + "-", "")] = schedules[parseInt($(inputElement).parent().attr("id").replace("schedule", "")) - 1]

  $(inputElement).attr("src", "assets/" + (Object.keys(favoriteSchedules).includes($(inputElement).attr("id").replace(favoriteIDPrefix + "-", "")) ? "favoriteIconPressed" : "favoriteIcon") + ".png")
}

function toggleFavoriteFilter()
{
  showingFavorites = !showingFavorites
  showingFavorites ? (schedulesTmp = schedules.concat(), schedules = Object.values(favoriteSchedules), numberOfSchedulesDisplaying = 0, displaySchedules()) : (schedules = schedulesTmp.concat(), displaySchedules())
}

function reloadThenShowFavorites()
{
  generateSchedules(function()
  {
    showingFavorites = true
    schedulesTmp = schedules.concat()
    schedules = Object.values(favoriteSchedules)
    numberOfSchedulesDisplaying = 0
    displaySchedules()
  })
}

function toggleSecondSemesterDisplay(inputElement)
{
  var scheduleDivID = $(inputElement).parent().attr("id")
  Object.keys(expandedSchedules).includes($(inputElement).attr("id").replace(expandIDPrefix + "-", "")) ? delete expandedSchedules[$(inputElement).attr("id").replace(expandIDPrefix + "-", "")] : expandedSchedules[$(inputElement).attr("id").replace(expandIDPrefix + "-", "")] = schedules[parseInt(scheduleDivID.replace("schedule", "")) - 1]

  var scheduleIsExpanded = Object.keys(expandedSchedules).includes($(inputElement).attr("id").replace(expandIDPrefix + "-", ""))

  var fullScheduleDivID = "fullSchedule" + scheduleDivID.replace("schedule", "")
  if (scheduleIsExpanded)
  {
    animateExpand(inputElement)
    createSecondSemesterScheduleDivs(fullScheduleDivID)
  }
  else
  {
    animateCollapse(inputElement)
    removeSecondSemesterScheduleDivs(fullScheduleDivID)
  }
}

function animateExpand(inputElement)
{
  $(inputElement).addClass("animation-rotate-clockwise")
  setTimeout(function() {
    $(inputElement).removeClass("animation-rotate-clockwise")
    $(inputElement).attr("src", "assets/expandIconEnabled.png")
  }, 200)
}

function animateCollapse(inputElement)
{
  $(inputElement).addClass("animation-rotate-counterclockwise")
  setTimeout(function() {
    $(inputElement).removeClass("animation-rotate-counterclockwise")
    $(inputElement).attr("src", "assets/expandIcon.png")
  }, 200)
}

async function createSecondSemesterScheduleDivs(fullScheduleDivID)
{
  var firstSemesterSchedules = schedules.concat()
  var scheduleID = parseInt(fullScheduleDivID.replace("fullSchedule", ""))
  var scheduleToMatch = firstSemesterSchedules[scheduleID-1]

  var courseObjects = await getCoursesPromise(selectedCourseCodes)

  schedules = []
  currentSchedule = []

  await scheduleLoopSearch(0, secondSemesterID-1, true)

  semesterNumberShowing = 1

  var secondSemesterSchedules = findSecondSemesterSchedules(scheduleToMatch, courseObjects)

  var secondSemesterHTML = "<div class='secondSemesterSchedules' id='secondSemesterSchedules" + scheduleID + "'><br><br>"
  for (scheduleNum in secondSemesterSchedules)
  {
    var scheduleHTML = await createScheduleDivHTML(secondSemesterSchedules, scheduleNum, true, false)
    secondSemesterHTML += scheduleHTML + "<br><br>"
  }
  secondSemesterHTML += "</div>"

  $("#" + fullScheduleDivID).append(secondSemesterHTML)

  semesterNumberShowing = 0

  schedules = firstSemesterSchedules
}

function removeSecondSemesterScheduleDivs(fullScheduleDivID)
{
  var scheduleID = parseInt(fullScheduleDivID.replace("fullSchedule", ""))
  $("#secondSemesterSchedules" + scheduleID).remove()
}

//MARK: - Filters

var justRemovedFilter = false

function setupFilterMenu()
{
  var selection = $("#selection")
  if ($(".filterSelectionContainer") != null)
  {
    $(".filterSelectionContainer").remove()
  }
  selection.prepend("<div class='filterSelectionContainer'><div class='filterSelection'></div></div>")

  var filterSelection = $(".filterSelection")
  filterSelection.append('<h2 style="color: white;">Filters</h2>')

  if (filters.concat().reverse()[0] == undefined || filters.concat().reverse()[0] == null || (Object.keys(filters.concat().reverse()[0]).length > 0 && !justRemovedFilter))
  {
    filters.push({})
  }

  if (justRemovedFilter)
  {
    justRemovedFilter = false
  }

  for (var filterNum = 0; filterNum < filters.length; filterNum++)
  {
    addFilterSelectHTML(filterNum)

    $("#filterCourse" + filterNum + " option[value='" + filters[filterNum]["courseCode"] + "']").prop('selected', true)
    $("#filterBlock" + filterNum + " option[value='" + filters[filterNum]["blockNumber"] + "']").prop('selected', true)
    $("#filterTeacher" + filterNum + " option[value='" + window.btoa(filters[filterNum]["teacher"]) + "']").prop('selected', true)
  }

  filterSelection.append("<span id='filterBreaks0'><br></span>")
  filterSelection.append("<button id='addFilterButton' onclick='addFilter()'>Add Filter</button>")
  filterSelection.append("<button id='removeFilterButton' onclick='removeFilter()'>Remove Filter</button>")
  filterSelection.append("<span id='filterBreaks1'><br><br></span>")
}

function addFilterSelectHTML(filterNum)
{
  var filterSelection = $(".filterSelection")
  var filterRow = $("<span id=filterRow" + filterNum + ">")

  let courseFilterSelect = $("<select class='filterSelect' id='filterCourse" + filterNum.toString() + "'>")
  courseFilterSelect.append($('<option>',
  {
    value: "none",
    text: "None"
  }))
  for (courseNum in courseObjects)
  {
    courseFilterSelect.append($('<option>',
    {
      value: courseObjects[courseNum].courseCode,
      text: courseObjects[courseNum].courseName
    }))
  }
  courseFilterSelect.append($('<option>',
  {
    value: offBlockID,
    text: "Off Block"
  }))
  courseFilterSelect.on('change', function(e)
  {
    var courseSelected = this.value
    var filterNumber = parseInt($(this).attr("id").replace("filterCourse", ""))
    if (filters[filterNumber]["courseCode"] != courseSelected)
    {
      $("#filterBlock" + filterNumber.toString()).empty()
      addDefaultFilterBlockOptions($("#filterBlock" + filterNumber.toString()))

      $("#filterTeacher" + filterNumber.toString()).empty()
      addDefaultFilterTeacherOptions($("#filterTeacher" + filterNumber.toString()))

      var shouldReload = (filters[filterNumber]["courseCode"] != undefined && filters[filterNumber]["blockNumber"] != undefined && filters[filterNumber]["teacher"] != undefined)

      if (courseSelected != "none")
      {
        filters[filterNumber]["courseCode"] = courseSelected
      }
      else
      {
        delete filters[filterNumber]["courseCode"]
      }

      delete filters[filterNumber]["blockNumber"]
      delete filters[filterNumber]["teacher"]

      addFilterBlockSelectionOptions($("#filterBlock" + filterNumber.toString()), filterNumber)
      addFilterTeacherSelectionOptions($("#filterTeacher" + filterNumber.toString()), filterNumber)

      if (shouldReload)
      {
        loadSchedules(semesterNumberShowing)
      }
    }
  })
  filterRow.append(courseFilterSelect)

  let blockFilterSelect = $("<select id='filterBlock" + filterNum.toString() + "'>")
  addDefaultFilterBlockOptions(blockFilterSelect)
  addFilterBlockSelectionOptions(blockFilterSelect, filterNum)

  blockFilterSelect.on('change', function(e)
  {
    var blockSelected = this.value
    var filterNumber = parseInt($(this).attr("id").replace("filterBlock", ""))
    if (filters[filterNumber]["blockNumber"] != blockSelected)
    {
      $("#filterTeacher" + filterNumber.toString()).empty()
      addDefaultFilterTeacherOptions($("#filterTeacher" + filterNumber.toString()))

      if (blockSelected != "none")
      {
        filters[filterNumber]["blockNumber"] = blockSelected
      }
      else
      {
        delete filters[filterNumber]["blockNumber"]
      }

      addFilterTeacherSelectionOptions($("#filterTeacher" + filterNumber.toString()), filterNumber)

      var shouldReload = (filters[filterNumber]["teacher"] != undefined)

      if (blockSelected == "none" || blockSelected == "any" || !(filters[filterNumber]["teacher"] == "any" || (filters[filterNumber]["courseCode"] != undefined && filters[filterNumber]["blockNumber"] != undefined && Object.keys(blockArrays[semesterNumberShowing][parseInt(filters[filterNumber]["blockNumber"])]).includes(filters[filterNumber]["courseCode"]) && blockArrays[semesterNumberShowing][parseInt(filters[filterNumber]["blockNumber"])][filters[filterNumber]["courseCode"]].includes(filters[filterNumber]["teacher"]))))
      {
        delete filters[filterNumber]["teacher"]
      }

      if (shouldReload)
      {
        loadSchedules(semesterNumberShowing)
      }
    }
  })
  filterRow.append(blockFilterSelect)

  let teacherFilterSelect = $("<select id='filterTeacher" + filterNum.toString() + "'>")
  addDefaultFilterTeacherOptions(teacherFilterSelect)
  addFilterTeacherSelectionOptions(teacherFilterSelect, filterNum)

  teacherFilterSelect.on('change', function(e)
  {
    var filterNumber = parseInt($(this).attr("id").replace("filterTeacher", ""))
    var teacherSelected = this.value
    var filterTeacherChanged = (filters[filterNumber]["teacher"] != window.atob(teacherSelected))
    if (teacherSelected != "none")
    {
      filters[filterNumber]["teacher"] = window.atob(teacherSelected)
    }
    else
    {
      delete filters[filterNumber]["teacher"]
    }

    if (filterTeacherChanged)
    {
      loadSchedules(semesterNumberShowing)
    }
  })
  filterRow.append(teacherFilterSelect)

  filterSelection.append(filterRow)
  filterSelection.append("<span id='filterBreak" + filterNum + "'><br></span>")
}

function addFilterBlockSelectionOptions(blockFilterSelect, filterNum)
{
  if (filters[filterNum]["courseCode"] == null || !filters[filterNum]["courseCode"].includes(offBlockID))
  {
    for (var blockNum = 0; blockNum < maxClasses + 1; blockNum++)
    {
      if (filters[filterNum]["courseCode"] != null && Object.keys(blockArrays[semesterNumberShowing][blockNum]).includes(filters[filterNum]["courseCode"]))
      {
        let blockName = "Block " + (parseInt(blockNum + 1)).toString()
        blockFilterSelect.append($('<option>',
        {
          value: blockNum,
          text: blockName
        }))
      }
    }
  }
  else
  {
    let offBlockRegex = RegExp(offBlockID + "\\d+")
    for (var blockNum = 0; blockNum < maxClasses + 1; blockNum++)
    {
      if (Object.keys(blockArrays[semesterNumberShowing][blockNum]).some(courseToTest => offBlockRegex.test(courseToTest)))
      {
        let blockName = "Block " + (parseInt(blockNum + 1)).toString()
        blockFilterSelect.append($('<option>',
        {
          value: blockNum,
          text: blockName
        }))
      }
    }
  }
}

function addFilterTeacherSelectionOptions(teacherFilterSelect, filterNum)
{
  var teachersToSelect
  if (filters[filterNum]["blockNumber"] != null && filters[filterNum]["blockNumber"] != "any")
  {
    teachersToSelect = (filters[filterNum]["courseCode"] != null && !filters[filterNum]["courseCode"].includes(offBlockID) && filters[filterNum]["blockNumber"] != null) ? blockArrays[semesterNumberShowing][parseInt(filters[filterNum]["blockNumber"])][filters[filterNum]["courseCode"]] : []
  }
  else if (filters[filterNum]["courseCode"] != null && !filters[filterNum]["courseCode"].includes(offBlockID))
  {
    teachersToSelect = selectedTeachers[selectedCourseCodes.indexOf(filters[filterNum]["courseCode"])]
  }
  else
  {
    teachersToSelect = []
  }
  for (var teacherNum = 0; teacherNum < teachersToSelect.length; teacherNum++)
  {
    let teacherName = teachersToSelect[teacherNum]
    teacherFilterSelect.append($('<option>',
    {
      value: window.btoa(teacherName),
      text: teacherName
    }))
  }
}

function addDefaultFilterBlockOptions(blockFilterSelect)
{
  blockFilterSelect.append($('<option>',
  {
    value: "none",
    text: "None"
  }))
  blockFilterSelect.append($('<option>',
  {
    value: "any",
    text: "Any"
  }))
}

function addDefaultFilterTeacherOptions(teacherFilterSelect)
{
  teacherFilterSelect.append($('<option>',
  {
    value: "none",
    text: "None"
  }))
  teacherFilterSelect.append($('<option>',
  {
    value: window.btoa("any"),
    text: "Any"
  }))
}

function addFilter()
{
  var filterSelection = $(".filterSelection")
  $("#filterBreaks0").remove()
  $("#addFilterButton").remove()
  $("#removeFilterButton").remove()
  $("#filterBreaks1").remove()

  filters.push({})

  addFilterSelectHTML(filters.length - 1)

  filterSelection.append("<span id='filterBreaks0'><br></span>")
  filterSelection.append("<button id='addFilterButton' onclick='addFilter()'>Add Filter</button>")
  filterSelection.append("<button id='removeFilterButton' onclick='removeFilter()'>Remove Filter</button>")
  filterSelection.append("<span id='filterBreaks1'><br><br></span>")
}

function removeFilter()
{
  $("#filterRow" + (parseInt(filters.length - 1)).toString()).remove()
  $("#filterBreak" + (parseInt(filters.length - 1)).toString()).remove()

  var filterToRemove = filters.concat().reverse()[0]
  var shouldReload = (filterToRemove["courseCode"] != undefined && filterToRemove["blockNumber"] != undefined && filterToRemove["teacher"] != undefined)

  filters.splice(filters.length - 1, 1)

  if (shouldReload)
  {
    justRemovedFilter = true
    loadSchedules(semesterNumberShowing)
  }
  else if (filters.length == 0)
  {
    addFilter()
  }
}

//MARK: - Sessions

function saveSession(id)
{
  if (id == null || id == "")
  {
    return
  }

  console.log("Saving Data...")

  var checkedSelectedTeachers = selectedTeachers.concat()
  for (teacherArrayNum in checkedSelectedTeachers)
  {
    for (teacherNum in checkedSelectedTeachers[teacherArrayNum])
    {
      checkedSelectedTeachers[teacherArrayNum][teacherNum] = checkedSelectedTeachers[teacherArrayNum][teacherNum].replace(new RegExp("\"", 'g'), "\"")
    }
  }

  var dataToSave = {
    "command": "save",
    "id": id,
    "coursesJSON": JSON.stringify(selectedCourseCodes),
    "teachersJSON": JSON.stringify(checkedSelectedTeachers),
    "offBlocksJSON": JSON.stringify(selectedOffBlocks),
    "filtersJSON": JSON.stringify(filters),
    "favoriteSchedulesJSON": JSON.stringify(favoriteSchedules)
  }
  console.log(dataToSave)

  $.post(sessionSource, dataToSave, function(data)
  {
    console.log("Data Saved!")
  })
}

function loadSession(id, completion, isShare)
{
  if (id == null || id == "")
  {
    return
  }

  if (isShare == null || !isShare)
  {
    $.post(sessionSource,
    {
      "command": "load",
      "id": id
    }, function(data)
    {
      loadSessionJSON(data)
      completion ? completion() : false
    })
  }
  else
  {
    $.post(sessionSource,
    {
      "command": "loadShare",
      "shareUUID": id
    }, function(data)
    {
      loadSessionJSON(data)
      completion ? completion() : false
    })
  }
}

function loadSessionJSON(json)
{
  if (json != null && json.length >= 1)
  {
    selectedCourseCodes = JSON.parse(json[0]["coursesJSON".toLowerCase()] ? json[0]["coursesJSON".toLowerCase()] : "[]")
    selectedTeachers = JSON.parse(json[0]["teachersJSON".toLowerCase()] ? json[0]["teachersJSON".toLowerCase()] : "[]")
    selectedOffBlocks = JSON.parse(json[0]["offBlocksJSON".toLowerCase()] ? json[0]["offBlocksJSON".toLowerCase()] : "[]")
    filters = JSON.parse(json[0]["filtersJSON".toLowerCase()] ? json[0]["filtersJSON".toLowerCase()] : "[]")
    favoriteSchedules = JSON.parse(json[0]["favoriteSchedulesJSON".toLowerCase()] ? json[0]["favoriteSchedulesJSON".toLowerCase()] : "[]")
  }
}

function shareSession(id)
{
  if (id == null || id == "")
  {
    return
  }

  var dataToSend = {
    "command": "share",
    "id": id
  }

  var shareUUID

  $.post(sessionSource, dataToSend, function(data) {
    shareUUID = data[0]["shareUUID".toLowerCase()]
  }).done(function() {
    $("#sessionShare").show()
    $("#sessionShare").val(window.location.protocol + "//" + window.location.host + window.location.pathname + "?shareUUID=" + shareUUID)
  })
}

function copySession()
{
  $("#sessionShare")[0].focus()
  $("#sessionShare")[0].select()
  if (document.execCommand('Copy'))
    alert("Copied!")
}

function postWithPromise(source, dataToSend, completion)
{
  var postPromise = new Promise(function(resolve, reject) {
    $.post(source, dataToSend, function(data)
    {
      completion(data)
      resolve()
    })
  })

  return postPromise
}
