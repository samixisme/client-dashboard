import { z } from 'zod'
import { ContainerPropsSchema as BaseContainerPropsSchema } from '@usewaypoint/block-container'

const ContainerPropsSchema = z.object({
  style: BaseContainerPropsSchema.shape.style,
  props: z
    .object({
      childrenIds: z.array(z.string()).optional(),
    })
    .optional()
    .nullable(),
})

export type ContainerProps = z.infer<typeof ContainerPropsSchema>
export default ContainerPropsSchema
