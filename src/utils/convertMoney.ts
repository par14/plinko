const USDollar = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  useGrouping: true,
  maximumFractionDigits: 2,
})

export const convertMoney = (price: number) => {
  return USDollar.format(price)
}
