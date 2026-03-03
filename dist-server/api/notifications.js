"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_1 = require("@novu/api");
const router = (0, express_1.Router)();
const novu = new api_1.Novu({
    secretKey: process.env.NOVU_API_KEY || '',
});
router.post('/trigger', async (req, res) => {
    try {
        const { workflowId, subscriberId, payload = {} } = req.body;
        if (!workflowId || !subscriberId) {
            return res.status(400).json({ error: 'workflowId and subscriberId are required' });
        }
        const result = await novu.trigger({
            workflowId,
            to: { subscriberId },
            payload,
        });
        return res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Novu trigger error:', error);
        return res.status(500).json({ error: 'Failed to trigger notification' });
    }
});
exports.default = router;
