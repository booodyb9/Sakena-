// Exact source grades applying to complete texts; excludes partial or mixed assessments.
export const acceptedGrades = new Set([
  'صحيح', 'صحيح لغيره', 'الحديثان صحيحان', 'صحيحان', 'صحيحة',
  'صحيح على شرط البخاري', 'صحيح بطرقه وشواهده', 'صحيح بمجموع طرقه',
  'صحيح بشواهده', 'صحيح بروايتيه', 'صحيح بكل رواياته',
  'صحيح، وزيادة أبي داود صحيحة', 'حسن صحيح', 'قال النووي: حديث صحيح',
  'حديث أبي قتادة: صحيح.\nحديث ابن أبي أوفى: صحيح',
  'صحيح.\nرواية جابر: صحيحة',
]);
export function isSahihGrade(grade) {
  return typeof grade === 'string' && acceptedGrades.has(grade.trim());
}
