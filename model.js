function SchoolCourse(courseArray) {
    this.departmentNum = courseArray["departmentNumber"]
    this.courseCode = courseArray["courseCode"]
    this.courseName = courseArray["courseName"]
}

function SchoolBlock(blockArray) {
    this.sectionNumber = blockArray["sectionNumber"]
    this.blockCode = blockArray["blockCode"]
    this.blockNum = blockArray["blockNum"]
    this.roomNum = blockArray["roomNum"]
    this.teacher = blockArray["teacher"]
    this.courseCode = blockArray["courseCode"]
}

function SchoolDepartment(departmentArray) {
    this.departmentTitle = departmentArray["departmentTitle"]
    this.departmentNum = departmentArray["departmentNumber"]
}
