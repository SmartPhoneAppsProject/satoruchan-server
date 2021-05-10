// ['FF:FF:FF:FF:FF:F1', 'FF:FF:FF:FF:FF:F2'] => ('FF:FF:FF:FF:FF:F1'),('FF:FF:FF:FF:FF:F2')
export const formatInsertValue = (data: string[]) => {
  let formated = '';
  const lastData = data.length - 1;
  data.forEach((ma, i) => {
    formated += i !== lastData ? `('${ma}'),` : `('${ma}')`
  })

  return formated;

}