// api/nutriplan.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Проверяем авторизацию (кроме опции OPTIONS)
    const token = req.headers.authorization?.split(' ')[1];
    if (req.method !== 'OPTIONS' && !token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // GET: получение всех данных пользователя
    if (req.method === 'GET' && req.query.action === 'all') {
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const userId = user.id;
        
        // Получаем рецепты
        const { data: recipes, error: recipesError } = await supabase
            .from('nutriplan_recipes')
            .select('*')
            .eq('user_id', userId);
        
        if (recipesError) return res.status(500).json({ error: recipesError.message });
        
        // Получаем меню
        const { data: menu, error: menuError } = await supabase
            .from('nutriplan_menu')
            .select('*')
            .eq('user_id', userId);
        
        if (menuError) return res.status(500).json({ error: menuError.message });
        
        // Получаем список покупок
        const { data: shopping, error: shoppingError } = await supabase
            .from('nutriplan_shopping')
            .select('*')
            .eq('user_id', userId);
        
        if (shoppingError) return res.status(500).json({ error: shoppingError.message });
        
        return res.json({
            success: true,
            recipes: recipes || [],
            menu: menu?.length ? menu[0].data : [],
            shopping: shopping?.length ? shopping[0].data : []
        });
    }

    // POST: сохранение всех данных
    if (req.method === 'POST' && req.body.action === 'save_all') {
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const userId = user.id;
        const { recipes, menu, shopping } = req.body;
        
        // Сохраняем рецепты
        const { error: recipesDeleteError } = await supabase
            .from('nutriplan_recipes')
            .delete()
            .eq('user_id', userId);
        
        if (recipesDeleteError) return res.status(500).json({ error: recipesDeleteError.message });
        
        if (recipes && recipes.length) {
            const recipesToInsert = recipes.map(r => ({
                user_id: userId,
                data: r
            }));
            const { error: recipesInsertError } = await supabase
                .from('nutriplan_recipes')
                .insert(recipesToInsert);
            if (recipesInsertError) return res.status(500).json({ error: recipesInsertError.message });
        }
        
        // Сохраняем меню
        const { error: menuDeleteError } = await supabase
            .from('nutriplan_menu')
            .delete()
            .eq('user_id', userId);
        
        if (menuDeleteError) return res.status(500).json({ error: menuDeleteError.message });
        
        if (menu && menu.length) {
            const { error: menuInsertError } = await supabase
                .from('nutriplan_menu')
                .insert({ user_id: userId, data: menu });
            if (menuInsertError) return res.status(500).json({ error: menuInsertError.message });
        }
        
        // Сохраняем список покупок
        const { error: shoppingDeleteError } = await supabase
            .from('nutriplan_shopping')
            .delete()
            .eq('user_id', userId);
        
        if (shoppingDeleteError) return res.status(500).json({ error: shoppingDeleteError.message });
        
        if (shopping && shopping.length) {
            const { error: shoppingInsertError } = await supabase
                .from('nutriplan_shopping')
                .insert({ user_id: userId, data: shopping });
            if (shoppingInsertError) return res.status(500).json({ error: shoppingInsertError.message });
        }
        
        return res.json({ success: true });
    }
    
    return res.status(404).json({ error: 'Unknown action' });
}
