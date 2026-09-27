/** Buma Labs fork: catalog status of a product. */
export type ProductStatus = "active" | "inactive" | "testing" | "paused"

export interface Product {
  id: string
  name: string
  weightGrams: number
  filamentType: string
  costPrice: number
  /** Online sale price (manual). Named `salePrice` for older data. */
  salePrice: number
  sold: boolean
  createdAt: number
  updatedAt: number
  /** Buma Labs fork fields — absent on products saved before them. */
  status?: ProductStatus
  link?: string
  printTimeHours?: number
  /** In-person sale price (manual). */
  inPersonPrice?: number
}

export interface ProductFormData {
  name: string
  weightGrams: number
  filamentType: string
  costPrice: number
  salePrice: number
  status?: ProductStatus
  link?: string
  printTimeHours?: number
  inPersonPrice?: number
}
