const service=require('../services/employee.service');
const auditLog=require('../utils/audit-log');
function whitelist(body, fields) {
  return Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
}
exports.list=async(req,res)=>res.render('employees/list',{title:'Quản lý nhân viên',employees:await service.list(req.query.q||''),q:req.query.q||'',error:null});
exports.createPage=(req,res)=>res.render('employees/form',{title:'Thêm nhân viên',employee:null,error:null});
exports.create=async(req,res)=>{const input=whitelist(req.body,['fullName','username','email','password','phone','address','position','role']);try{await service.create(input);auditLog('employee_created',{actorUserId:req.session.user.id,role:input.role});res.redirect('/employees?notice=created');}catch(e){if(e.statusCode && e.statusCode<500){const employee=whitelist(input,['fullName','username','email','phone','address','position','role']);return res.status(e.statusCode).render('employees/form',{title:'Thêm nhân viên',employee,error:e.message});}throw e;}};
exports.editPage=async(req,res)=>res.render('employees/form',{title:'Sửa nhân viên',employee:await service.get(req.params.id),error:null});
exports.update=async(req,res)=>{const input=whitelist(req.body,['fullName','email','phone','address','position']);try{await service.update(req.params.id,input);auditLog('employee_updated',{actorUserId:req.session.user.id,employeeId:Number(req.params.id)});res.redirect('/employees?notice=updated');}catch(e){if(e.statusCode && e.statusCode<500){return res.status(e.statusCode).render('employees/form',{title:'Sửa nhân viên',employee:{id:req.params.id,...input},error:e.message});}throw e;}};
exports.remove=async(req,res)=>{await service.remove(req.params.id,req.session.user.id);auditLog('employee_deleted',{actorUserId:req.session.user.id,employeeId:Number(req.params.id)});res.json({success:true,message:'Đã xóa nhân viên.',data:{id:Number(req.params.id)},errors:[]});};

