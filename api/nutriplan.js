// api/nutriplan.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    // Получаем пользователя из токена
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
        console.error('Auth error:', userError);
        return res.status(401).json({ error: 'Invalid token', details: userError });
    }
    
    const userId = user.id;
    console.log(`✅ User authenticated: ${userId}`);

    // GET: получение всех данных
    if (req.method === 'GET' && req.query.action === 'all') {
        try {
            const { data: recipes, error: recipesError } = await supabase
                .from('nutriplan_recipes')
                .select('*')
                .eq('user_id', userId);
            
            if (recipesError) return res.status(500).json({ error: recipesError.message });
            
            const { data: menu, error: menuError } = await supabase
                .from('nutriplan_menu')
                .select('*')
                .eq('user_id', userId);
            
            if (menuError) return res.status(500).json({ error: menuError.message });
            
            const { data: shopping, error: shoppingError } = await supabase
                .from('nutriplan_shopping')
                .select('*')
                .eq('user_id', userId);
            
            if (shoppingError) return res.status(500).json({ error: shoppingError.message });
            
            const recipesData = (recipes || []).map(r => r.data);
            const menuData = (menu && menu.length && menu[0]) ? menu[0].data : [];
            const shoppingData = (shopping && shopping.length && shopping[0]) ? shopping[0].data : [];
            
            return res.json({
                success: true,
                recipes: recipesData,
                menu: menuData,
                shopping: shoppingData
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // POST: сохранение всех данных
    if (req.method === 'POST' && req.body.action === 'save_all') {
        const { recipes, menu, shopping } = req.body;
        
        try {
            // Удаляем старые данные
            await supabase.from('nutriplan_recipes').delete().eq('user_id', userId);
            await supabase.from('nutriplan_menu').delete().eq('user_id', userId);
            await supabase.from('nutriplan_shopping').delete().eq('user_id', userId);
            
            // Сохраняем рецепты
            if (recipes && recipes.length) {
                const recipesToInsert = recipes.map(r => ({ user_id: userId, data: r }));
                const { error: recipesError } = await supabase
                    .from('nutriplan_recipes')
                    .insert(recipesToInsert);
                if (recipesError) return res.status(500).json({ error: recipesError.message });
            }
            
            // Сохраняем меню
            if (menu && menu.length) {
                const { error: menuError } = await supabase
                    .from('nutriplan_menu')
                    .insert({ user_id: userId, data: menu });
                if (menuError) return res.status(500).json({ error: menuError.message });
            }
            
            // Сохраняем список покупок
            if (shopping && shopping.length) {
                const { error: shoppingError } = await supabase
                    .from('nutriplan_shopping')
                    .insert({ user_id: userId, data: shopping });
                if (shoppingError) return res.status(500).json({ error: shoppingError.message });
            }
            
            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    
    return res.status(404).json({ error: 'Unknown action' });
}
