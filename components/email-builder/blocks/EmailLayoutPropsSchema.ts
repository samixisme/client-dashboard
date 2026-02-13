import { z } from 'zod'

const EmailLayoutPropsSchema = z.object({
  backdropColor: z.string().optional().nullable(),
  canvasColor: z.string().optional().nullable(),
  textColor: z.string().optional().nullable(),
  fontFamily: z.enum([
    'MODERN_SANS', 'BOOK_SANS', 'ORGANIC_SANS', 'GEOMETRIC_SANS',
    'HEAVY_SANS', 'ROUNDED_SANS', 'MODERN_SERIF', 'BOOK_SERIF', 'MONOSPACE',
  ]).optional().nullable(),
  borderRadius: z.number().optional().nullable(),
  borderColor: z.string().optional().nullable(),
  childrenIds: z.array(z.string()).optional().nullable(),
})

export type EmailLayoutProps = z.infer<typeof EmailLayoutPropsSchema>
export default EmailLayoutPropsSchema
